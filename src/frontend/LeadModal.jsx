import React, { useState } from "react";
import {
    Button,
    Heading,
    Inline,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    Select,
    Stack,
    Strong,
    Text,
    UserPicker,
    Lozenge,
} from "@forge/react";
import { invoke } from "@forge/bridge";

export const LeadModal = ({
    isOpen,
    closeModal,
    activeLead,
    updateLead,
    statusOptions,
    priorityOptions,
}) => {
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen || !activeLead) return null;

    const handleCreateFollowUp = async () => {
        setIsCreating(true);

        const response = await invoke("createFollowUpIssue", {
            lead: activeLead,
        });
        console.log("Backend response:", response.message);

        setIsCreating(false);
        closeModal();
    };

    return (
        <Modal onClose={closeModal} width="x-large">
            <ModalHeader>
                <ModalTitle></ModalTitle>
            </ModalHeader>
            <ModalBody>
                <Stack space="space.400">
                    <Inline spread="space-between" alignBlock="center">
                        <Text>
                            <Strong>{activeLead.id}</Strong>
                        </Text>

                        <Inline space="space.100" alignBlock="center">
                            <Lozenge appearance="new">NO FOLLOW-UP</Lozenge>
                            <Button
                                appearance="primary"
                                isDisabled={!activeLead.assignee}
                                isLoading={isCreating}
                                onClick={handleCreateFollowUp}
                            >
                                Create Follow-up
                            </Button>
                        </Inline>
                    </Inline>

                    <Inline
                        space="space.200"
                        spread="space-between"
                        alignBlock="center"
                    >
                        <Heading as="h2">
                            {activeLead.prospect} Campaign Setup
                        </Heading>
                        <Select
                            appearance="default"
                            options={statusOptions}
                            value={statusOptions.find(
                                (opt) => opt.value === activeLead.status,
                            )}
                            onChange={(option) =>
                                updateLead(
                                    activeLead.id,
                                    "status",
                                    option.value,
                                )
                            }
                        />
                    </Inline>

                    <Inline space="space.600" alignBlock="start">
                        <Stack space="space.400">
                            <Stack space="space.100">
                                <Heading as="h4">Description</Heading>
                                <Text>
                                    Inbound lead originating from the{" "}
                                    {activeLead.campaign}. The company
                                    associated with this prospect is{" "}
                                    {activeLead.company}.
                                </Text>
                                <Text>
                                    Please review the CRM details, verify the
                                    contact information, and link any related
                                    subtasks for the marketing team to execute.
                                </Text>
                            </Stack>

                            <Stack space="space.100">
                                <Heading as="h4">Related work</Heading>
                                <Text>No linked items.</Text>
                            </Stack>
                        </Stack>

                        <Stack space="space.300">
                            <Heading as="h4">Details</Heading>

                            <Stack space="space.200">
                                <Stack space="space.050">
                                    <Text>
                                        <Strong>Assignee</Strong>
                                    </Text>
                                    <UserPicker
                                        placeholder="Unassigned"
                                        value={activeLead.assignee || null}
                                        name={`modal-assignee-${activeLead.id}`}
                                        onChange={(userId) =>
                                            updateLead(
                                                activeLead.id,
                                                "assignee",
                                                userId,
                                            )
                                        }
                                    />
                                </Stack>

                                <Stack space="space.050">
                                    <Text>
                                        <Strong>Priority</Strong>
                                    </Text>
                                    <Select
                                        appearance="subtle"
                                        options={priorityOptions}
                                        value={priorityOptions.find(
                                            (opt) =>
                                                opt.value ===
                                                activeLead.priority,
                                        )}
                                        onChange={(option) =>
                                            updateLead(
                                                activeLead.id,
                                                "priority",
                                                option.value,
                                            )
                                        }
                                    />
                                </Stack>
                            </Stack>
                        </Stack>
                    </Inline>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Button appearance="warning" onClick={closeModal}>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
};
