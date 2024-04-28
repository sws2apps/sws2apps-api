import { CircuitRecordType, MeetingRecordType, OutgoingSpeakersRecordType } from '../denifition/congregation.js';
import {
	dbCongregationLoadDetails,
	dbCongregationSaveBackup,
	dbCongregationSaveEncryptionKey,
} from '../services/firebase/congregations.js';
import { User } from './User.js';
import { UsersList } from './Users.js';

export class Congregation {
	id: string;
	country_code: string;
	cong_name: string;
	cong_number: string;
	cong_location: { address: string; lat: number | null; lng: number | null };
	cong_circuit: CircuitRecordType[];
	midweek_meeting: MeetingRecordType[];
	weekend_meeting: MeetingRecordType[];
	cong_members: User[];
	cong_encryption: string;
	last_backup: string | undefined;
	cong_outgoing_speakers: OutgoingSpeakersRecordType;
	cong_discoverable: { value: boolean; updatedAt: string };

	constructor(id: string) {
		this.id = id;
		this.country_code = '';
		this.cong_name = '';
		this.cong_number = '';
		this.cong_location = { lat: null, lng: null, address: '' };
		this.cong_circuit = [{ type: 'main', name: '' }];
		this.cong_members = [];
		this.last_backup = undefined;
		this.cong_encryption = '';
		this.midweek_meeting = [{ type: 'main', weekday: null, time: '' }];
		this.weekend_meeting = [{ type: 'main', weekday: null, time: '' }];
		this.cong_outgoing_speakers = { list: null, access: [] };
		this.cong_discoverable = { value: false, updatedAt: '' };
	}

	async loadDetails() {
		const data = await dbCongregationLoadDetails(this.id);

		this.cong_encryption = data.cong_encryption;
		this.cong_name = data.cong_name;
		this.cong_number = data.cong_number;
		this.country_code = data.country_code;
		this.last_backup = data.last_backup;
		this.cong_location = data.cong_location;
		this.cong_circuit = data.cong_circuit;
		this.midweek_meeting = data.midweek_meeting;
		this.weekend_meeting = data.weekend_meeting;
		this.cong_discoverable = data.cong_discoverable;
		this.cong_outgoing_speakers = data.cong_outgoing_speakers;

		this.reloadMembers();
	}

	async saveBackup() {
		this.last_backup = await dbCongregationSaveBackup(this.id);
	}

	async saveEncryptionKey(key: string) {
		await dbCongregationSaveEncryptionKey(this.id, key);
		this.cong_encryption = key;
	}

	hasMember(auth_uid: string) {
		const user = UsersList.findByAuthUid(auth_uid);
		return user!.cong_id === this.id;
	}

	reloadMembers() {
		const cong_members: User[] = [];

		for (const user of UsersList.list) {
			if (user.cong_id === this.id) {
				cong_members.push(user);
			}
		}

		this.cong_members = cong_members;
	}

	getVisitingSpeakersAccessList() {
		const approvedCong = this.cong_outgoing_speakers.access.filter((record) => record.status === 'approved');

		const result = approvedCong.map((cong) => {
			return { cong_id: cong.cong_id, cong_number: cong.cong_number, cong_name: cong.cong_name };
		});

		return result;
	}
}
