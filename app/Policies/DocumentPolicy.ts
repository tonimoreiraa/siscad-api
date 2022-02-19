import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import Document from 'App/Models/Document'
import User from 'App/Models/User'

export default class DocumentPolicy extends BasePolicy {
	public async use(user: User, document: Document) {
		return document.user_id == user.id
	}
}
