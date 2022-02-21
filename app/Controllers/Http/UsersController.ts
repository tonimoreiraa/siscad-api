// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import User from "App/Models/User";

export default class UsersController {
    async index() {
        const users = await User.all()
        return users.map(user => user.serialize()) 
    }

    async show({request}) {
        const userId = request.param('id')
        const user = await User.findOrFail(userId)
        return user.serialize()
    }

    async destroy({request, auth, response}) {
        const userId = request.param('id')
        if (auth.user.id !== 1 || userId === 1) return response.badRequest({message: 'Você não tem permissão.'})
        const user = await User.findOrFail(userId)
        await user.delete()
    }

    async store({request, auth, response}) {
        if (auth.user.id !== 1) return response.badRequest({message: 'Você não tem permissão.'})
        const data = request.only(['name', 'email', 'password'])
        const user = await User.create(data)
        return user.serialize()
    }

    async changePassword({request, auth, response}) {
        const userId = request.param('id')
        const password = request.input('password')
        if (auth.user.id !== 1 || userId === 1) return response.badRequest({message: 'Você não tem permissão.'})

        const user = await User.findOrFail(userId)
        user.password = password
        await user.save()

        return user.serialize()
    }
}
