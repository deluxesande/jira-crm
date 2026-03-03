import React from "react";
import {
    Text,
    Button,
    Inline,
    Stack,
    UserPicker,
    Heading,
    Strong,
    Select,
    Modal,
    ModalTitle,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from "@forge/react";

export const LeadModal = ({
    isOpen,
    closeModal,
    activeLead,
    updateLead,
    statusOptions,
    priorityOptions,
}) => {
    if (!isOpen || !activeLead) return null;

    return (
        <Modal onClose={closeModal} width="x-large">
            <ModalHeader>
                <ModalTitle>
                    <Text>{activeLead.id}</Text>
                </ModalTitle>
            </ModalHeader>
            <ModalBody>
                <Stack space="space.400">
                    {/* Header Area with Status Dropdown */}
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

                    {/* Main 2-Column Layout */}
                    <Inline space="space.600" alignBlock="start">
                        {/* Left Column: Description & Work */}
                        <Stack space="space.400">
                            <Stack space="space.100">
                                <Heading as="h4">Description</Heading>
                                <Text>
                                    Inbound lead originating from the **
                                    {activeLead.campaign}**. The company
                                    associated with this prospect is **
                                    {activeLead.company}**.
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

                        {/* Right Column: Details Sidebar */}
                        <Stack space="space.300">
                            <Heading as="h4">Details</Heading>

                            <Stack space="space.200">
                                <Stack space="space.050">
                                    <Text>
                                        <Strong>Assignee</Strong>
                                    </Text>
                                    <UserPicker
                                        placeholder="Unassigned"
                                        name={`modal-assignee-${activeLead.id}`}
                                        onChange={(user) =>
                                            console.log(
                                                `Assigned via modal:`,
                                                user,
                                            )
                                        }
                                    />
                                </Stack>

                                <Stack space="space.050">
                                    <Text>
                                        <Strong>Reporter</Strong>
                                    </Text>
                                    <Text>Deluxe Sande</Text>
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
                <Button appearance="subtle" onClick={closeModal}>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
};
