import React, { useState } from "react";
import ForgeReconciler, {
    Text,
    DynamicTable,
    Button,
    Stack,
    UserPicker,
    Heading,
    Strong,
    Select,
} from "@forge/react";

// Import the new modal component you just created
import { LeadModal } from "./LeadModal";

const initialLeads = [
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

const statusOptions = [
    { label: "Not Started", value: "not_started" },
    { label: "In Progress", value: "in_progress" },
    { label: "Done", value: "done" },
];

const priorityOptions = [
    { label: "Highest", value: "Highest" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
];

const App = () => {
    const [leads, setLeads] = useState(initialLeads);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeLead, setActiveLead] = useState(null);

    const updateLead = (id, field, value) => {
        setLeads((prevLeads) =>
            prevLeads.map((lead) =>
                lead.id === id ? { ...lead, [field]: value } : lead,
            ),
        );

        if (activeLead && activeLead.id === id) {
            setActiveLead((prev) => ({ ...prev, [field]: value }));
        }
    };

    const openModal = (lead) => {
        setActiveLead(lead);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveLead(null);
    };

    const head = {
        cells: [
            { key: "lead", content: "Work" },
            { key: "assignee", content: "Assignee" },
            { key: "priority", content: "Priority" },
            { key: "status", content: "Status" },
        ],
    };

    const rows = leads.map((lead) => ({
        key: lead.id,
        cells: [
            {
                key: "lead",
                content: (
                    <Button
                        appearance="subtle"
                        spacing="none"
                        onClick={() => openModal(lead)}
                    >
                        <Stack space="space.050" alignInline="start">
                            <Text>
                                <Strong>{lead.id}</Strong> {lead.prospect}
                            </Text>
                        </Stack>
                    </Button>
                ),
            },
            {
                key: "assignee",
                content: (
                    <UserPicker
                        placeholder="Unassigned"
                        name={`assignee-${lead.id}`}
                        onChange={(user) =>
                            console.log(`Assigned ${lead.id} to:`, user)
                        }
                    />
                ),
            },
            {
                key: "priority",
                content: (
                    <Select
                        appearance="subtle"
                        options={priorityOptions}
                        value={priorityOptions.find(
                            (opt) => opt.value === lead.priority,
                        )}
                        onChange={(option) =>
                            updateLead(lead.id, "priority", option.value)
                        }
                    />
                ),
            },
            {
                key: "status",
                content: (
                    <Select
                        appearance="default"
                        options={statusOptions}
                        value={statusOptions.find(
                            (opt) => opt.value === lead.status,
                        )}
                        onChange={(option) =>
                            updateLead(lead.id, "status", option.value)
                        }
                    />
                ),
            },
        ],
    }));

    return (
        <Stack space="space.300">
            <Heading as="h3">Inbound Lead Triage</Heading>
            <DynamicTable head={head} rows={rows} />

            <LeadModal
                isOpen={isModalOpen}
                closeModal={closeModal}
                activeLead={activeLead}
                updateLead={updateLead}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
            />
        </Stack>
    );
};

ForgeReconciler.render(<App />);
