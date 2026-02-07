/**
 * Graph Initialization Module
 *
 * Models the JSON data files as a virtual FlowQuery graph.
 * Creates virtual nodes and relationships using FlowQuery Cypher.
 * Uses native LOAD JSON FROM to read data from the /data/ endpoint.
 */
import FlowQuery from "flowquery";

/**
 * Initializes the virtual FlowQuery graph with data from JSON files.
 * Creates nodes for: User, Chat, Email, Event, File
 * Creates relationships connecting them based on the data.
 */
export async function initializeGraph(): Promise<void> {
    console.log("Initializing FlowQuery graph...");

    // Create all nodes
    await createUserNodes();
    await createChatNodes();
    await createEmailNodes();
    await createEventNodes();
    await createFileNodes();

    // Create relationships
    await createUserManagesRelationships();
    await createChatMemberRelationships();
    await createEmailSentByRelationships();
    await createEmailReceivedByRelationships();
    await createEventOrganizerRelationships();
    await createEventAttendeeRelationships();
    await createFileCreatedByRelationships();
    await createFileSharedWithRelationships();
    await createEmailAttachmentRelationships();
    await createEventFileRelationships();
    await createEventEmailRelationships();

    console.log("FlowQuery graph initialized successfully.");
}

// ============ Node Creation Functions ============

async function createUserNodes(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User) AS {
            LOAD JSON FROM '/data/users.json' AS user
            RETURN 
                user.id AS id, user.displayName AS displayName, user.mail AS mail, 
                user.jobTitle AS jobTitle, user.department AS department,
                user.officeLocation AS officeLocation, user.managerId AS managerId, 
                user.directReports AS directReports, user.hireDate AS hireDate, 
                user.skills AS skills, user.phone AS phone
        }
    `);
    await runner.run();
    console.log("Created User nodes");
}

async function createChatNodes(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Chat) AS {
            LOAD JSON FROM '/data/chats.json' AS chat
            RETURN chat.id AS id, chat.topic AS topic, chat.type AS type, 
                chat.teamName AS teamName, chat.members AS members, chat.messages AS messages
        }
    `);
    await runner.run();
    console.log("Created Chat nodes");
}

async function createEmailNodes(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Email) AS {
            LOAD JSON FROM '/data/emails.json' AS email
            RETURN 
                email.id AS id, email.subject AS subject, email.from AS fromUser, 
                email.to AS toUsers, email.cc AS cc, email.receivedDateTime AS receivedDateTime, 
                email.body AS body, email.importance AS importance, 
                email.hasAttachments AS hasAttachments, email.attachments AS attachments, 
                email.isRead AS isRead, email.conversationId AS conversationId, 
                email.categories AS categories
        }
    `);
    await runner.run();
    console.log("Created Email nodes");
}

async function createEventNodes(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Event) AS {
            LOAD JSON FROM '/data/events.json' AS event
            RETURN 
                event.id AS id, event.subject AS subject, event.organizer AS organizer, 
                event.attendees AS attendees, event.start AS start, event.end AS end, 
                event.location AS location, event.isOnline AS isOnline, 
                event.onlineMeetingUrl AS onlineMeetingUrl, event.body AS body, 
                event.recurrence AS recurrence, event.relatedEmails AS relatedEmails, 
                event.relatedFiles AS relatedFiles, event.categories AS categories
        }
    `);
    await runner.run();
    console.log("Created Event nodes");
}

async function createFileNodes(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:File) AS {
            LOAD JSON FROM '/data/files.json' AS file
            RETURN 
                file.id AS id, file.name AS name, file.createdBy AS createdBy, 
                file.createdDateTime AS createdDateTime, file.lastModifiedBy AS lastModifiedBy, 
                file.lastModifiedDateTime AS lastModifiedDateTime, file.size AS size, 
                file.mimeType AS mimeType, file.webUrl AS webUrl, file.driveId AS driveId, 
                file.parentFolder AS parentFolder, file.sharedWith AS sharedWith, 
                file.relatedEmails AS relatedEmails, file.relatedEvents AS relatedEvents, 
                file.tags AS tags
        }
    `);
    await runner.run();
    console.log("Created File nodes");
}

// ============ Relationship Creation Functions ============

async function createUserManagesRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User)-[:MANAGES]-(:User) AS {
            LOAD JSON FROM '/data/users.json' AS user
            RETURN user.managerId AS left_id, user.id AS right_id
        }
    `);
    await runner.run();
    console.log("Created User-[:MANAGES]->User relationships");
}

async function createChatMemberRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User)-[:MEMBER_OF]-(:Chat) AS {
            LOAD JSON FROM '/data/chats.json' AS chat
            UNWIND chat.members AS memberId
            RETURN memberId AS left_id, chat.id AS right_id
        }
    `);
    await runner.run();
    console.log("Created User-[:MEMBER_OF]->Chat relationships");
}

async function createEmailSentByRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User)-[:SENT]-(:Email) AS {
            LOAD JSON FROM '/data/emails.json' AS email
            RETURN email.from AS left_id, email.id AS right_id
        }
    `);
    await runner.run();
    console.log("Created User-[:SENT]->Email relationships");
}

async function createEmailReceivedByRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Email)-[:RECEIVED_BY]-(:User) AS {
            LOAD JSON FROM '/data/emails.json' AS email
            UNWIND email.to AS recipient
            RETURN email.id AS left_id, recipient AS right_id
        }
    `);
    await runner.run();
    console.log("Created Email-[:RECEIVED_BY]->User relationships");
}

async function createEventOrganizerRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User)-[:ORGANIZES]-(:Event) AS {
            LOAD JSON FROM '/data/events.json' AS event
            RETURN event.organizer AS left_id, event.id AS right_id
        }
    `);
    await runner.run();
    console.log("Created User-[:ORGANIZES]->Event relationships");
}

async function createEventAttendeeRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User)-[:ATTENDS]-(:Event) AS {
            LOAD JSON FROM '/data/events.json' AS event
            UNWIND event.attendees AS attendee
            RETURN attendee.userId AS left_id, event.id AS right_id
        }
    `);
    await runner.run();
    console.log("Created User-[:ATTENDS]->Event relationships");
}

async function createFileCreatedByRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:User)-[:CREATED]-(:File) AS {
            LOAD JSON FROM '/data/files.json' AS file
            RETURN file.createdBy AS left_id, file.id AS right_id
        }
    `);
    await runner.run();
    console.log("Created User-[:CREATED]->File relationships");
}

async function createFileSharedWithRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:File)-[:SHARED_WITH]-(:User) AS {
            LOAD JSON FROM '/data/files.json' AS file
            UNWIND file.sharedWith AS userId
            RETURN file.id AS left_id, userId AS right_id
        }
    `);
    await runner.run();
    console.log("Created File-[:SHARED_WITH]->User relationships");
}

async function createEmailAttachmentRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Email)-[:HAS_ATTACHMENT]-(:File) AS {
            LOAD JSON FROM '/data/emails.json' AS email
            WHERE email.hasAttachments = true
            UNWIND email.attachments AS fileId
            RETURN email.id AS left_id, fileId AS right_id
        }
    `);
    await runner.run();
    console.log("Created Email-[:HAS_ATTACHMENT]->File relationships");
}

async function createEventFileRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Event)-[:RELATED_TO_FILE]-(:File) AS {
            LOAD JSON FROM '/data/events.json' AS event
            UNWIND event.relatedFiles AS fileId
            WHERE fileId IS NOT NULL
            RETURN event.id AS left_id, fileId AS right_id
        }
    `);
    await runner.run();
    console.log("Created Event-[:RELATED_TO_FILE]->File relationships");
}

async function createEventEmailRelationships(): Promise<void> {
    const runner = new FlowQuery(`
        CREATE VIRTUAL (:Event)-[:RELATED_TO_EMAIL]-(:Email) AS {
            LOAD JSON FROM '/data/events.json' AS event
            UNWIND event.relatedEmails AS emailId
            WHERE emailId IS NOT NULL
            RETURN event.id AS left_id, emailId AS right_id
        }
    `);
    await runner.run();
    console.log("Created Event-[:RELATED_TO_EMAIL]->Email relationships");
}
