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

resolver.define("getInitialData", async (req) => {
    console.log("Backend: Fetching dashboard data from Forge KVS");
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
                issueKey: null, // Added to seed data
            },
            {
                id: "LEAD-102",
                prospect: "Ervin Howell",
                company: "Deckow-Crist",
                campaign: "Social Media Ad",
                priority: "High",
                status: "in_progress",
                assignee: null,
                issueKey: null, // Added to seed data
            },
            {
                id: "LEAD-103",
                prospect: "Clementine Bauch",
                company: "Romaguera-Jacobson",
                campaign: "Webinar Sign-up",
                priority: "Highest",
                status: "done",
                assignee: null,
                issueKey: null, // Added to seed data
            },
        ];
        await kvs.set("crm_leads_db", storedLeads);
    }
    return {
        leads: storedLeads,
        statusOptions: mockStatusOptions,
        priorityOptions: mockPriorityOptions,
    };
});

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
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to create issue in Jira:", errorData);
        throw new Error(`Failed to create Jira issue. Check backend logs.`);
    }

    const newIssue = await response.json();
    console.log(
        `Backend: Successfully created Jira issue with Key: ${newIssue.key}`,
    );

    return {
        success: true,
        message: `Successfully created Jira issue: ${newIssue.key}`,
        issueKey: newIssue.key, // We pass this back to the frontend
    };
});

export const handler = resolver.getDefinitions();
