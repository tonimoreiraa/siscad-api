import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Documents extends BaseSchema {
    protected tableName = 'documents'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.string('id').primary()
            table.integer('user_id').notNullable()
            table.string('name').notNullable()
            table.string('path').notNullable()

            /**
             * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
             */
            table.timestamp('created_at', { useTz: true })
            table.timestamp('updated_at', { useTz: true })
        })
    }

    public async down () {
        this.schema.dropTable(this.tableName)
    }
}
