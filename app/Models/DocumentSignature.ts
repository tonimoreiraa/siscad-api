import { DateTime } from 'luxon'
import { afterFetch, BaseModel, beforeSave, column } from '@ioc:Adonis/Lucid/Orm'

export default class DocumentSignature extends BaseModel {
    public static table = 'documents_signatures'

    @column({ isPrimary: true })
    public id: number

    @column()
    public client_identifier: string

    @column()
    public document_id: string

    @column()
    public type: 'certificate'|'pdf'

    @column()
    public images: string[]|string

    @column()
    public path: string

    @column()
    public request_address: string

    @column()
    public certificate_password: string

    @column.dateTime({ autoCreate: true })
    public created_at: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updated_at: DateTime

    @beforeSave()
    public static serializeImages(signature: DocumentSignature) {
        if (typeof(signature.images) !== 'string') {
            signature.images = JSON.stringify(signature.images)
        }
    }

    @afterFetch()
    public static loadImages(signature: DocumentSignature) {
        if (typeof(signature.images) === 'string') {
            signature.images = JSON.parse(signature.images)
        }
    }
}
