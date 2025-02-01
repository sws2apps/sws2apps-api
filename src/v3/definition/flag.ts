export type FeatureFlag = {
	id: string;
	name: string;
	description: string;
	availability: 'app' | 'user' | 'congregation';
	status: boolean;
	coverage: number;
	installations: { id: string; registered: string }[];
};
