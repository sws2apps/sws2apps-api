import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import type { BackupData } from '#modules/backups/index.js';
import { UserBackupError } from './user-backup-context.js';
import {
	saveUserBackup as saveUserBackupData,
	saveUserChunkedBackup as saveUserChunkedBackupData,
} from './user-backup-upload.service.js';
import { retrieveUserBackup as retrieveUserBackupData } from './users-backup.service.js';

const handleUserBackupError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof UserBackupError)) return false;

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		sendClientError(res, 400, 'CONG_NOT_ASSIGNED', 'user does not have an assigned congregation');
		return true;
	}

	if (error.code === 'INVALID_METADATA') {
		sendClientError(res, 400, 'BACKUP_METADATA_INVALID', 'backup metadata is invalid');
		return true;
	}

	if (error.code === 'INVALID_BACKUP') {
		sendClientError(res, 400, 'BACKUP_PAYLOAD_INVALID', 'backup payload is invalid');
		return true;
	}

	if (error.code === 'INVALID_CHUNK') {
		sendClientError(res, 400, 'BACKUP_CHUNK_INVALID', 'backup chunk is invalid');
		return true;
	}

	sendClientError(res, 404, 'error_app_congregation_not-found', 'user congregation is invalid');
	return true;
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	const { id } = req.params;

	let result: BackupData;

	try {
		result = await retrieveUserBackupData(id, req.headers.metadata!.toString());
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	sendSuccess(res, result, 'user retrieve backup successfully');
};

export const saveUserBackup = async (req: Request, res: Response) => {
	const { id } = req.params;

	const cong_backup = req.body.cong_backup as BackupData;
	let outcome;

	try {
		outcome = await saveUserBackupData(id, cong_backup);
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	if (outcome.status === 'conflict') {
		const logMessage = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});
		sendClientError(res, 400, 'BACKUP_OUTDATED', logMessage);

		return;
	}

	sendSuccess(res, { message: 'BACKUP_SENT' }, 'user send backup for congregation successfully');
};

export const saveUserChunkedBackup = async (req: Request, res: Response) => {
	const { id } = req.params;

	const uploadId = req.body.uploadId as string;
	const chunkIndex = req.body.chunkIndex as number;
	const chunkData = req.body.chunkData as string;
	const totalChunks = req.body.totalChunks as number;

	if (!uploadId || chunkIndex == null || !chunkData || !totalChunks) {
		sendClientError(res, 400, 'error_api_bad-request', 'backup chunk request is invalid');

		return;
	}

	let outcome;

	try {
		outcome = await saveUserChunkedBackupData(id, req.headers.metadata!.toString(), {
			uploadId,
			chunkIndex,
			chunkData,
			totalChunks,
		});
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	if (outcome.status === 'metadata_conflict') {
		const logMessage = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});
		sendClientError(res, 409, 'error_api_sync-conflict', logMessage);

		return;
	}

	if (outcome.status === 'backup_in_progress') {
		sendClientError(res, 409, 'error_api_sync-conflict', 'congregation already has a backup in progress');

		return;
	}

	if (outcome.status === 'saved') {
		sendSuccess(res, { message: 'BACKUP_SENT' }, 'user send backup for congregation successfully');
		return;
	}

	sendSuccess(res, { message: 'BACKUP_CHUNK_RECEIVED' }, 'congregation backup chunk processed');
};
