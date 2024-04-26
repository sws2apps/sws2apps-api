export type CongregationCreateInfoType = {
	country_code: string;
	cong_name: string;
	cong_number: string;
};

export type CongregationRecordType = {
	cong_name: string;
	cong_number: string;
	country_code: string;
	last_backup?: string;
};

export type ApiCongregationSearchResponse = {
	congName: string;
	congNumber: string;
};
