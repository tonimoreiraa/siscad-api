import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@ioc:Adonis/Lucid/Orm'
import {v4 as uuid} from 'uuid'

export default class Document extends BaseModel {
    @column()
    public id: string

    @column()
    public user_id: number

    @column()
    public name: string

    @column()
    public path: string

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static attributeId(document: Document) {
        document.id = uuid()
    }
}
