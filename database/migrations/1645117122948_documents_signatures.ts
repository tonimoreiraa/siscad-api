import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class DocumentsSignatures extends BaseSchema {
    protected tableName = 'documents_signatures'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.string('client_identifier').notNullable()
            table.string('document_id').notNullable()
            table.string('type').notNullable()
            table.string('path').notNullable()
            table.string('request_address').notNullable()
            table.string('certificate_password')

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
