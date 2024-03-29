/* eslint-disable brace-style */
const { getData, setData } = require('./dataStore.js');

// An async function that sends a message to the channel
async function sendMessage(client, channelID, message) {
	try {
		const channel = await client.channels.fetch(channelID);
		await channel.send(message);
	} catch (error) {
		console.error(error);
	}
}

// Converts a user's or role's id (as a string) to a mentionable (as a string).
function userIdToMentionable(userId) {
	// TODO: Add a client parameter to use discord.js's own userid to mentionable method
	return `<@${userId}>`;
}

// Sends any outstanding reminders based on dataStore.js, which we assume to be ordered where the upcoming reminder is first
// in the stored array.
async function sendScheduledMessages(client) {
	const data = getData();
	const currentDate = new Date();
	const currentTime = Math.floor(currentDate.getTime() / 1000);

	const remindersToSend = [];
	for (const reminder of data.reminders) {
		if (reminder.unixReminderTime <= currentTime) {
			remindersToSend.push(reminder);
		}
	}

	for (const reminder of remindersToSend) {
		console.log(`Sending the scheduled message with id ${reminder.id}`);
		let message = reminder.reminder;

		if (!reminder.anonymous) {
			message += `\n\nThis message was scheduled by ${userIdToMentionable(reminder.user.id)}.`;
		}

		try {
			await sendMessage(client, reminder.channel.id, message);
		} catch (error) {
			console.error(error);
		}

		for (const attachement of reminder.attachments) {
			try {
				await sendMessage(client, reminder.channel.id, attachement);
			} catch (error) {
				console.error(error);
			}
		}
	}

	data.reminders.splice(0, remindersToSend.length);
	console.log(`We sent out ${remindersToSend.length} scheduled messages on ${currentDate.toDateString()} at ${currentDate.toTimeString()}.\n`);
	setData(data);
}

// Generates a unique id.
function uid() {
	return Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9 * Math.pow(10, 12)).toString(36);
}

function reminderToChannelLink(reminder) {
	return `https://discord.com/channels/${reminder.channel.guildId}/${reminder.channel.id}`;
}

// Returns a string containing all the information that is to be displayed to the user about a scheduledMessage.
function getScheduledMessageInfo(message) {
	return '**Date** ' + new Date(message.unixReminderTime * 1000).toDateString() +
	'\n**Time:** ' + new Date(message.unixReminderTime * 1000).toTimeString() +
	'\n**Channel: **' + reminderToChannelLink(message) +
	'\n**Anonymous: **' + message.anonymous +
	'\n\n**Message:**\n' + message.reminder +
	'\n**Attachments:**\n' + message.attachments.join('\n');
}

// Deletes a scheduled message with the given messageId if the user with the given userId is the owner of the message and sends a reply to the interaction.
function deleteScheduledMessage(messageId) {
	const messages = getData().reminders;
	setData({ reminders: messages.filter(r => r.id !== messageId) });
}

function isValidTime(hour, minute) {
	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isValidDateAndTime(year, month, day, hour, minute) {
	const date = new Date(year, month - 1, day, hour, minute);
	return isValidTime(hour, minute) && !isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

module.exports = {
	sendMessage,
	userIdToMentionable,
	sendScheduledMessages,
	uid,
	reminderToChannelLink,
	getScheduledMessageInfo,
	deleteScheduledMessage,
	isValidTime,
	isValidDateAndTime,
};
