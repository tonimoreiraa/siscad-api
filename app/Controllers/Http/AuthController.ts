// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import User from "App/Models/User"
import Hash from '@ioc:Adonis/Core/Hash'

export default class AuthController {

  async login({auth, request, response}) {
      const email = request.input('email')
      const password = request.input('password')
    
      // Lookup user manually
      const user = await User
        .query()
        .where('email', email)
        .firstOrFail()
    
      // Verify password
      if (!(await Hash.verify(user.password, password))) {
        return response.badRequest({message: 'Senha incorreta.'})
      }
    
      // Generate token
      const {token} = await auth.use('api').generate(user)

      return {user, token}
  }
}
