import type { Request, Response } from 'express';

import { rejectInvalidRequest } from '../../http/validation-errors.js';
import type { BackupData } from '../backups/backup.types.js';
import { UserBackupError } from './user-backup-context.js';
import {
	saveUserBackup as saveUserBackupData,
	saveUserChunkedBackup as saveUserChunkedBackupData,
} from './user-backup-upload.service.js';
import { retrieveUserBackup as retrieveUserBackupData } from './users-backup.service.js';

const handleUserBackupError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof UserBackupError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		res.locals.message = 'user does not have an assigned congregation';
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });
		return true;
	}

	if (error.code === 'INVALID_METADATA') {
		res.locals.message = 'backup metadata is invalid';
		res.status(400).json({ message: 'BACKUP_METADATA_INVALID' });
		return true;
	}

	if (error.code === 'INVALID_BACKUP') {
		res.locals.message = 'backup payload is invalid';
		res.status(400).json({ message: 'BACKUP_PAYLOAD_INVALID' });
		return true;
	}

	if (error.code === 'INVALID_CHUNK') {
		res.locals.message = 'backup chunk is invalid';
		res.status(400).json({ message: 'BACKUP_CHUNK_INVALID' });
		return true;
	}

	res.locals.message = 'user congregation is invalid';
	res.status(404).json({ message: 'error_app_congregation_not-found' });
	return true;
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	let result: BackupData;

	try {
		result = await retrieveUserBackupData(id, req.headers.metadata!.toString());
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve backup successfully';
	res.status(200).json(result);
};

export const saveUserBackup = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const cong_backup = req.body.cong_backup as BackupData;
	let outcome;

	try {
		outcome = await saveUserBackupData(id, cong_backup);
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	if (outcome.status === 'conflict') {
		res.locals.message = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});

		res.locals.type = 'warn';
		res.status(400).json({ message: 'BACKUP_OUTDATED' });

		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user send backup for congregation successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const saveUserChunkedBackup = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const uploadId = req.body.uploadId as string;
	const chunkIndex = req.body.chunkIndex as number;
	const chunkData = req.body.chunkData as string;
	const totalChunks = req.body.totalChunks as number;

	if (!uploadId || chunkIndex == null || !chunkData || !totalChunks) {
		res.locals.type = 'warn';
		res.status(400).json({ message: 'error_api_bad-request' });

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
		res.locals.message = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});

		res.locals.type = 'warn';
		res.status(409).json({ message: 'error_api_sync-conflict' });

		return;
	}

	if (outcome.status === 'backup_in_progress') {
		res.locals.type = 'warn';
		res.locals.message = 'congregation already has a backup in progress';
		res.status(409).json({ message: 'error_api_sync-conflict' });

		return;
	}

	res.locals.type = 'info';
	if (outcome.status === 'saved') {
		res.locals.message = 'user send backup for congregation successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
		return;
	}

	res.locals.message = 'congregation backup chunk processed';
	res.status(200).json({ message: 'BACKUP_CHUNK_RECEIVED' });
};

