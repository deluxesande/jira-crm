import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import { kvs } from "@forge/kvs";

const resolver = new Resolver();

const mockStatusOptions = [
    { label: "Not Started", value: "not_started" },
    { label: "In Progress", value: "in_progress" },
    { label: "Done", value: "done" },
];

const mockPriorityOptions = [
    { label: "Highest", value: "Highest" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
];

/**
 * HELPER: Fetch and Transform leads from External API
 * This ensures we don't duplicate code across resolvers.
 */
async function fetchAndTransformExternalLeads(existingLeads = []) {
    console.log(
        "Backend: Fetching fresh lead data from JSONPlaceholder API...",
    );

    // Use api.fetch for Forge compatibility
    const externalResponse = await api.fetch(
        "https://jsonplaceholder.typicode.com/users",
    );

    if (!externalResponse.ok) {
        throw new Error(`API returned status ${externalResponse.status}`);
    }

    const externalUsers = await externalResponse.json();

    // Map external data to our schema
    const newLeads = externalUsers.map((user, index) => {
        // Create a unique ID that won't conflict with existing ones
        // Using timestamp + index for a pseudo-unique external ID
        const uniqueId = `LEAD-EXT-${Date.now()}-${index}`;

        return {
            id: uniqueId,
            prospect: user.name,
            company: user.company.name,
            campaign: [
                "Q1 PR Event",
                "Social Media Ad",
                "Webinar",
                "Cold Outreach",
            ][Math.floor(Math.random() * 4)],
            priority: ["Highest", "High", "Medium", "Low"][
                Math.floor(Math.random() * 4)
            ],
            status: "not_started",
            assignee: null,
            issueKey: null,
        };
    });

    // Merge with existing leads and persist
    const mergedLeads = [...existingLeads, ...newLeads];
    await kvs.set("crm_leads_db", mergedLeads);

    return mergedLeads;
}

/**
 * RESOLVER: getInitialData
 * This is the heart of your persistence and auto-fill logic.
 */
resolver.define("getInitialData", async (req) => {
    console.log("Backend: Checking CRM lead volume...");
    // Key-Value Store
    let storedLeads = (await kvs.get("crm_leads_db")) || [];

    // Filter leads that have NOT been followed up on (issueKey is null)
    const pendingFollowUps = storedLeads.filter((lead) => !lead.issueKey);

    console.log(
        `Backend: Found ${pendingFollowUps.length} leads without Jira tickets.`,
    );

    // TRIGGER: If leads without an issueKey are 5 or fewer, fetch more!
    if (pendingFollowUps.length <= 5) {
        console.log(
            "Backend: Lead threshold reached (<= 5). Pulling more leads from external DB...",
        );
        try {
            storedLeads = await fetchAndTransformExternalLeads(storedLeads);
        } catch (error) {
            console.error(
                "Auto-sync failed, using existing local data:",
                error.message,
            );
        }
    }

    return {
        leads: storedLeads,
        statusOptions: mockStatusOptions,
        priorityOptions: mockPriorityOptions,
    };
});

/**
 * RESOLVER: updateLeadField
 */
resolver.define("updateLeadField", async (req) => {
    const { leadId, field, value } = req.payload;
    console.log(
        `Backend: Persisting update for ${leadId} - ${field}: ${value}`,
    );

    const storedLeads = (await kvs.get("crm_leads_db")) || [];
    const updatedLeads = storedLeads.map((lead) =>
        lead.id === leadId ? { ...lead, [field]: value } : lead,
    );

    await kvs.set("crm_leads_db", updatedLeads);
    return { success: true };
});

/**
 * RESOLVER: createFollowUpIssue
 */
resolver.define("createFollowUpIssue", async (req) => {
    const { lead } = req.payload;
    console.log(
        "Backend: Request received to create follow-up for:",
        lead.prospect,
    );

    const bodyData = {
        fields: {
            project: { key: "MCM" },
            issuetype: { name: "Task" },
            summary: `Lead Follow-up: ${lead.prospect} (${lead.company})`,
            priority: { name: lead.priority },
            labels: ["crm_lead", lead.campaign.replace(/\s+/g, "_")],
            description: {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: "Inbound CRM Lead Details",
                                marks: [{ type: "strong" }],
                            },
                        ],
                    },
                    {
                        type: "bulletList",
                        content: [
                            {
                                type: "listItem",
                                content: [
                                    {
                                        type: "paragraph",
                                        content: [
                                            {
                                                type: "text",
                                                text: `Campaign Source: ${lead.campaign}`,
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: "listItem",
                                content: [
                                    {
                                        type: "paragraph",
                                        content: [
                                            {
                                                type: "text",
                                                text: `Company: ${lead.company}`,
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: "listItem",
                                content: [
                                    {
                                        type: "paragraph",
                                        content: [
                                            {
                                                type: "text",
                                                text: `External CRM ID: ${lead.id}`,
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    };

    if (lead.assignee) {
        let accountIdString = lead.assignee;
        if (typeof lead.assignee === "object" && lead.assignee !== null) {
            accountIdString = lead.assignee.accountId || lead.assignee.id;
        }
        if (accountIdString) {
            bodyData.fields.assignee = {
                id: accountIdString,
                accountId: accountIdString,
            };
        }
    }

    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to create issue in Jira:", errorData);
        throw new Error(`Failed to create Jira issue. Check backend logs.`);
    }

    const newIssue = await response.json();

    // IMPORTANT: Update the local database to include the issueKey so the threshold counts correctly
    const storedLeads = (await kvs.get("crm_leads_db")) || [];
    const updatedLeads = storedLeads.map((l) =>
        l.id === lead.id ? { ...l, issueKey: newIssue.key } : l,
    );
    await kvs.set("crm_leads_db", updatedLeads);

    return {
        success: true,
        message: `Successfully created Jira issue: ${newIssue.key}`,
        issueKey: newIssue.key,
    };
});

export const handler = resolver.getDefinitions();
