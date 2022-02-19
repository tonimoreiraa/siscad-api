// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Document from "App/Models/Document";
import Application from '@ioc:Adonis/Core/Application';
import {v4 as uuid} from 'uuid'
import DocumentSignature from "App/Models/DocumentSignature";
import { sign } from 'pdf-signer'
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import sizeOf from 'image-size';

/**
 * Concatenate two PDFs in Buffers
 * @param {Buffer} firstBuffer 
 * @param {Buffer} secondBuffer 
 * @returns {Buffer} - a Buffer containing the concactenated PDFs
 */
const combinePDFBuffers = async (firstBuffer, imageBuffer) => {
    // const newRecipe = new HummusRecipe(firstBuffer, dest);
    // newRecipe
    //     .endPage()
    // .endPDF()
    const pdfDoc = await PDFDocument.load(firstBuffer)
    const imgDimensions = sizeOf(imageBuffer)
    const img = await pdfDoc.embedPng(imageBuffer)
    const imagePage = pdfDoc.insertPage(pdfDoc.getPageCount())
    imagePage.drawImage(img, {
        x: imagePage.getWidth() / 2 - imgDimensions.width /2,
        y: imagePage.getHeight() / 2 - imgDimensions.height /2,
        width: imgDimensions.width,
        height: imgDimensions.height
    })
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
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
        return auth.user ? {...document.serialize(), signatures: (await DocumentSignature.query().where('document_id', document.id)).map(d => d.serialize())} : document.serialize()
    }

    async sign({request, response}) {
        // document
        const documentId = request.param('documentId')
        const document = await Document.findOrFail(documentId)

        // get type of signature
        const type = request.input('type')
        if (type !== 'certificate' && type !== 'pdf') return response.badRequest({message: 'Tipo de assinatura desconhecida.'})

        // verify identifier
        if (!request.input('client_identifier').length) {
            return response.badRequest({message: 'Você deve se identificar.'})
        }

        // upload file
        const file = request.file('certificate', {size: '4mb', extnames: type === 'certificate' ? ['p12'] : ['png']})
        
        if (!file) return response.badRequest({message: 'Você deve enviar um certificado.'})
        
        if (!file.isValid) {
            response.badRequest(file.errors)
        }

        // save file
        const tmpPath = Application.tmpPath('uploads')
        var filePath = uuid() + '.' + file.extname
        await file.move(tmpPath, {name: filePath})

        // create on db
        const data = request.only(['client_identifier', 'type', 'certificate_password'])
        data.document_id = document.id
        data.path = filePath
        data.request_address = request.ip()

        const signature = await DocumentSignature.create(data)

        return signature.serialize()
    }

    async downloadWithSignature({request, response, bouncer}) {
        const documentId = request.param('documentId')
        const signatureId = request.param('signatureId')

        const document = await Document.findOrFail(documentId)
        const signature = await DocumentSignature.findOrFail(signatureId)

        await bouncer.with('DocumentPolicy').authorize('use', document)

        const tempPath = Application.tmpPath('uploads')

        const cachePath = Application.tmpPath()
        const file = `${cachePath}/cache-${document.id}-${signature.id}.pdf`

        const documentBuffer = fs.readFileSync(tempPath + '/' + document.path)
        const certificateBuffer = fs.readFileSync(tempPath + '/' + signature.path)

        const pdf = signature.type === 'certificate' ? await sign(documentBuffer, certificateBuffer, signature.certificate_password, {
            reason: '2',
            signerName: signature.client_identifier,
            annotationAppearanceOptions: {
              signatureCoordinates: {left: 0, bottom: 0, right: 0, top: 0},
              signatureDetails: []
            },
        }) : await combinePDFBuffers(documentBuffer, certificateBuffer)
        fs.writeFileSync(file, pdf)
        return response.download(file)
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
