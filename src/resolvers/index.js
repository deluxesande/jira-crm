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
 * RESOLVER: getInitialData
 * Replaces the static array with a call to Forge Storage (our actual DB).
 * If the DB is empty, it simulates fetching from your external CRM API and seeds the DB.
 */
resolver.define("getInitialData", async (req) => {
    console.log("Backend: Fetching dashboard data from Forge KVS");

    // 3. Swap storage.get for kvs.get
    let storedLeads = await kvs.get("crm_leads_db");

    if (!storedLeads) {
        console.log("Backend: DB empty. Fetching external CRM data...");
        storedLeads = [
            {
                id: "LEAD-101",
                prospect: "Leanne Graham",
                company: "Romaguera-Crona",
                campaign: "Q1 PR Gala Event",
                priority: "Medium",
                status: "not_started",
                assignee: null,
            },
            {
                id: "LEAD-102",
                prospect: "Ervin Howell",
                company: "Deckow-Crist",
                campaign: "Social Media Ad",
                priority: "High",
                status: "in_progress",
                assignee: null,
            },
            {
                id: "LEAD-103",
                prospect: "Clementine Bauch",
                company: "Romaguera-Jacobson",
                campaign: "Webinar Sign-up",
                priority: "Highest",
                status: "done",
                assignee: null,
            },
        ];
        // 4. Swap storage.set for kvs.set
        await kvs.set("crm_leads_db", storedLeads);
    }

    return {
        leads: storedLeads,
        statusOptions: mockStatusOptions,
        priorityOptions: mockPriorityOptions,
    };
});

/**
 * RESOLVER: updateLeadField
 * Fetches the current DB state, mutates the specific record, and saves it back.
 */
resolver.define("updateLeadField", async (req) => {
    const { leadId, field, value } = req.payload;
    console.log(
        `Backend: Persisting update for ${leadId} - ${field}: ${value}`,
    );

    // 5. Swap storage for kvs
    const storedLeads = (await kvs.get("crm_leads_db")) || [];

    const updatedLeads = storedLeads.map((lead) =>
        lead.id === leadId ? { ...lead, [field]: value } : lead,
    );

    // 6. Swap storage for kvs
    await kvs.set("crm_leads_db", updatedLeads);

    return { success: true };
});

/**
 * RESOLVER: createFollowUpIssue
 * Maps the external CRM fields into a format Jira understands, then makes a
 * secure REST API call to create the issue in the Marketing Campaign Management workspace.
 */
resolver.define("createFollowUpIssue", async (req) => {
    const { lead } = req.payload;
    console.log(
        "Backend: Request received to create follow-up for:",
        lead.prospect,
    );

    // 1. Build the payload mapped to the Marketing Campaign Management workspace
    const bodyData = {
        fields: {
            project: {
                key: "MCM", // Your target project key
            },
            // Defaulting to "Task".
            // Note: If you want these to be "Sub-tasks" like in your screenshot,
            // you must change this to "Sub-task" AND provide a parent issue key below.
            issuetype: {
                name: "Task",
            },
            // Map the Lead prospect and company to the Jira summary
            summary: `Lead Follow-up: ${lead.prospect} (${lead.company})`,

            // Map the CRM priority directly to Jira's Priority field
            priority: {
                name: lead.priority,
            },

            // Turn the Campaign source into a searchable Jira Label
            // (e.g., "Webinar_Sign-up")
            labels: ["crm_lead", lead.campaign.replace(/\s+/g, "_")],

            // Map the custom CRM details into Jira's native Description field
            // using the Atlassian Document Format (ADF)
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

    // 2. Only append the assignee field if an assignee was selected in the frontend modal
    if (lead.assignee) {
        // Safe extraction: If the database accidentally hands us an object from older saves,
        // we extract the accountId string. Otherwise, we use the string directly.
        const accountIdString =
            typeof lead.assignee === "object"
                ? lead.assignee.accountId
                : lead.assignee;

        // Jira REST API strictly requires the ID to be a string
        bodyData.fields.assignee = { id: accountIdString };
    }

    // 3. Make the API request securely as the user interacting with the app
    const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
    });

    // 4. Handle any validation errors from Jira (e.g., missing required fields)
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to create issue in Jira:", errorData);
        throw new Error(`Failed to create Jira issue. Check backend logs.`);
    }

    const newIssue = await response.json();
    console.log(
        `Backend: Successfully created Jira issue with Key: ${newIssue.key}`,
    );

    // Return the new issue key to the frontend so we can display it
    return {
        success: true,
        message: `Successfully created Jira issue: ${newIssue.key}`,
        issueKey: newIssue.key,
    };
});

export const handler = resolver.getDefinitions();
