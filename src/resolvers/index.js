import Resolver from "@forge/resolver";

const resolver = new Resolver();

let mockLeadsDb = [
    {
        id: "LEAD-101",
        prospect: "Leanne Graham",
        company: "Romaguera-Crona",
        campaign: "Q1 PR Gala Event",
        priority: "Medium",
        status: "not_started",
    },
    {
        id: "LEAD-102",
        prospect: "Ervin Howell",
        company: "Deckow-Crist",
        campaign: "Social Media Ad",
        priority: "High",
        status: "in_progress",
    },
    {
        id: "LEAD-103",
        prospect: "Clementine Bauch",
        company: "Romaguera-Jacobson",
        campaign: "Webinar Sign-up",
        priority: "Highest",
        status: "done",
    },
];

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

resolver.define("getInitialData", (req) => {
    console.log("Backend: Fetching initial dashboard data");
    return {
        leads: mockLeadsDb,
        statusOptions: mockStatusOptions,
        priorityOptions: mockPriorityOptions,
    };
});

resolver.define("updateLeadField", (req) => {
    const { leadId, field, value } = req.payload;
    console.log(
        `Backend: Updating lead ${leadId} - changing ${field} to`,
        value,
    );

    mockLeadsDb = mockLeadsDb.map((lead) =>
        lead.id === leadId ? { ...lead, [field]: value } : lead,
    );

    return { success: true };
});

resolver.define("createFollowUpIssue", async (req) => {
    const { lead } = req.payload;
    console.log(
        "Backend: Request received to create follow-up for:",
        lead.prospect,
    );

    return {
        success: true,
        message: `Successfully created Jira issue for ${lead.prospect}`,
    };
});

export const handler = resolver.getDefinitions();
