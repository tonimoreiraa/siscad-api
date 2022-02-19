import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class DocumentSignature extends BaseModel {
    public static table = 'documents_signatures'

    @column({ isPrimary: true })
    public id: number

    @column()
    public client_identifier: string

    @column()
    public document_id: string

    @column()
    public type: 'certificate'|'signature'

    @column()
    public path: string

    @column()
    public request_address: string

    @column()
    public certificate_password: string

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime
}