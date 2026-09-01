import fetch from 'node-fetch';

import { env } from '#config/env.js';

export type CongregationDirectoryRecord = {
	congName: string;
	congGuid: string;
	address: string;
	location: { lat: number; lng: number };
	midweekMeetingTime: { weekday: number; time: string };
	weekendMeetingTime: { weekday: number; time: string };
	circuit: string;
};

export type CongregationDirectoryQuery = {
	country: string;
	language: string;
	name: string;
};

export class CongregationDirectoryRequestError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number) {
		super('FETCH_FAILED');
		this.name = 'CongregationDirectoryRequestError';
		this.statusCode = statusCode;
	}
}

const requestCongregations = async (query: CongregationDirectoryQuery) => {
	const directoryUrl = env.appCongregationApi + new URLSearchParams(query);

	return fetch(directoryUrl);
};

export const searchCongregations = async (
	query: CongregationDirectoryQuery,
): Promise<CongregationDirectoryRecord[]> => {
	const response = await requestCongregations(query);

	if (!response.ok) {
		throw new CongregationDirectoryRequestError(response.status);
	}

	return response.json() as Promise<CongregationDirectoryRecord[]>;
};

export const verifyCongregation = async (
	query: CongregationDirectoryQuery,
): Promise<CongregationDirectoryRecord[]> => {
	const response = await requestCongregations(query);

	if (response.status !== 200) {
		throw new CongregationDirectoryRequestError(response.status);
	}

	return response.json() as Promise<CongregationDirectoryRecord[]>;
};
