// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Document from "App/Models/Document";
import Application from '@ioc:Adonis/Core/Application';
import {v4 as uuid} from 'uuid'
import DocumentSignature from "App/Models/DocumentSignature";
import { sign } from 'pdf-signer'
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import sizeOf from 'image-size';

async function exportDocumentWithSignature(document: Document, signature: DocumentSignature) {
    
    const tempPath = Application.tmpPath('uploads')
    const documentBuffer = fs.readFileSync(tempPath + '/' + document.path)
    const signatureBuffer = fs.readFileSync(tempPath + '/' + signature.path)

    const pdf = await PDFDocument.load(documentBuffer, {ignoreEncryption: true})
    const signPage = pdf.insertPage(pdf.getPageCount())
    signPage.drawText('O documento foi conferido, revisado e aceito em sua total integralidade por ' + signature.client_identifier + ' no endereço IP ' + signature.request_address + ' em ' + signature.created_at.toLocaleString() + '.', {
        size: 12,
        x: 25,
        y: signPage.getHeight() - 25,
        maxWidth: signPage.getWidth() - 50
    })

    var imagePos = signPage.getHeight() - 60
    if (signature.type == 'pdf') {
        // add signature images
        await Promise.all([signatureBuffer, ...(signature.images ? signature.images.map(img => fs.readFileSync(tempPath + '/' + img)) : [])].map(async (image: Buffer) => {
            const imgDimensions: any = sizeOf(image)
            const img = await pdf.embedPng(image)
            imagePos -= 210
            signPage.drawImage(img, {
                x: 25,
                y: imagePos,
                width: (imgDimensions.width*200)/imgDimensions.height,
                height: 200
            })
        }))
    }

    var pdfBytes = await pdf.save({useObjectStreams: false})

    if (signature.type == 'certificate') {
        const tmpFilePath = `${Application.tmpPath()}/tmp-${document.id}-${signature.id}-pdf.pdf`
        fs.writeFileSync(tmpFilePath, pdfBytes)
        pdfBytes = await sign(fs.readFileSync(tmpFilePath), signatureBuffer, signature.certificate_password, {
            reason: '2',
            signerName: signature.client_identifier,
            annotationAppearanceOptions: {
                signatureCoordinates: {left: 0, bottom: 0, right: 0, top: 0},
                signatureDetails: []
            }
        })

        fs.unlinkSync(tmpFilePath)
    }

    const filePath = `${Application.tmpPath()}/tmp-${document.id}-${signature.id}.pdf`
    fs.writeFileSync(filePath, pdfBytes)

    return filePath
}

export default class DocumentsController {
    async index({auth}) {
        const documents = await Document.query().where('user_id', auth.user.id)
        return documents.map(document => document.serialize())
    }

    async store({auth, request, response}) {
        if (!request.input('name').length) {
            return response.badRequest({message: 'Você deve digitar um nome para o documento.'})
        }

        const file = request.file('document', {extnames: ['pdf']})
        
        if (!file) {
            return response.badRequest({message: 'Você deve enviar um arquivo PDF válido'})
        }
        
        if (!file.isValid) {
            response.badRequest(file.errors)
        }
        
        const filePath = uuid() + '.' + file.extname
        await file.move(Application.tmpPath('uploads'), {name: filePath})

        const data = request.only(['name'])
        data.user_id = auth.user.id
        data.path = filePath

        const document = await Document.create(data)

        return document.serialize()
    }

    async show({request, auth}) {
        const documentId = request.param('id')
        const document = await Document.findOrFail(documentId)
        if (!auth.user && (await DocumentSignature.query().where('document_id', document.id)).length) return response.badRequest({message: 'Este protocolo já foi assinado.'})
        return auth.user ? {...document.serialize(), signatures: (await DocumentSignature.query().where('document_id', document.id)).map(d => d.serialize())} : document.serialize()
    }

    async sign({request, response}) {
        // document
        const documentId = request.param('documentId')
        const document = await Document.findOrFail(documentId)
        const data = request.only(['client_identifier', 'type', 'certificate_password'])

        if ((await DocumentSignature.query().where('document_id', document.id)).length) return response.badRequest({message: 'Este protocolo já foi assinado.'})

        // get type of signature
        const type = request.input('type')
        if (type !== 'certificate' && type !== 'pdf') return response.badRequest({message: 'Tipo de assinatura desconhecida.'})

        // verify identifier
        if (!request.input('client_identifier').length) return response.badRequest({message: 'Você deve se identificar.'})

        // upload selfie and id image
        if (type == 'pdf') {
            const images = request.files('identity', {
                size: '4mb',
                extnames: ['jpg', 'png'],
            })
            if (!images || images.length !== 2) return response.badRequest({message: 'Você deve enviar uma selfie e a imagem da sua identidade.'})
            data.images = []
            for (let image of images) {
                const imagePath = uuid() + '.' + image.extname
                await image.move(Application.tmpPath('uploads'), {name:imagePath})
                data.images.push(imagePath)
            }
        }

        // upload file
        const file = request.file('certificate', {size: '4mb', extnames: type === 'certificate' ? ['p12'] : ['png']})
        if (!file) return response.badRequest({message: 'Você deve enviar um certificado.'})
        if (!file.isValid) return response.badRequest(file.errors)

        // save file
        const tmpPath = Application.tmpPath('uploads')
        var filePath = uuid() + '.' + file.extname
        await file.move(tmpPath, {name: filePath})

        // create on db
        data.document_id = document.id
        data.path = filePath
        data.request_address = request.ip()

        const signature = await DocumentSignature.create(data)

        return signature.serialize()
    }

    async downloadWithSignature({request, response}) {
        const documentId = request.param('documentId')
        const signatureId = request.param('signatureId')

        const document = await Document.findOrFail(documentId)
        const signature = await DocumentSignature.findOrFail(signatureId)

        const pdf = await exportDocumentWithSignature(document, signature)

        setTimeout(() => {
            fs.unlinkSync(pdf)
        }, 30000)
        return response.download(pdf, true)
    }

    async destroy({request, bouncer}) {
        const documentId = request.param('id')
        const document = await Document.findOrFail(documentId)
        await bouncer.with('DocumentPolicy').authorize('use', document)
        await document.delete()
    }

    async destroySignature({request, response}) {
        const documentId = request.param('documentId')
        const document = await Document.findOrFail(documentId)

        const signatureId = request.param('id')
        const signature = await DocumentSignature.findOrFail(signatureId)

        if (document.id !== signature.document_id) return response.badRequest({message: 'Requisição inválida.'})
        
        await signature.delete()
    }
}
