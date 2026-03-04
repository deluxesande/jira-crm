import React, { useState, useEffect } from "react";
import ForgeReconciler, {
    Text,
    DynamicTable,
    Button,
    Stack,
    UserPicker,
    Heading,
    Strong,
    Select,
    Spinner,
    Inline,
} from "@forge/react";
import { invoke } from "@forge/bridge";
import { LeadModal } from "./LeadModal";

// Helper function to guarantee we only pass a clean string to the UserPicker
export const getSafeUserId = (user) => {
    if (!user) return null;
    return typeof user === "object" ? user.accountId || user.id : user;
};

const App = () => {
    const [leads, setLeads] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [priorityOptions, setPriorityOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeLead, setActiveLead] = useState(null);

    useEffect(() => {
        invoke("getInitialData").then((data) => {
            setLeads(data.leads);
            setStatusOptions(data.statusOptions);
            setPriorityOptions(data.priorityOptions);
            setIsLoading(false);
        });
    }, []);

    const updateLead = async (id, field, value) => {
        setLeads((prevLeads) =>
            prevLeads.map((lead) =>
                lead.id === id ? { ...lead, [field]: value } : lead,
            ),
        );

        if (activeLead && activeLead.id === id) {
            setActiveLead((prev) => ({ ...prev, [field]: value }));
        }

        await invoke("updateLeadField", { leadId: id, field, value });
    };

    const openModal = (lead) => {
        setActiveLead(lead);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveLead(null);
    };

    if (isLoading) {
        return (
            <Stack space="space.200" alignInline="center">
                <Spinner size="large" />
                <Text>Loading CRM Leads...</Text>
            </Stack>
        );
    }

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
                        // Use the helper to sanitize bad database objects
                        value={getSafeUserId(lead.assignee)}
                        onChange={(userId) =>
                            updateLead(lead.id, "assignee", userId)
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
