import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import User from 'App/Models/User'

export default class UserDefaultAccountSeeder extends BaseSeeder {
  public async run () {
    await User.create({
      name: 'Toni Moreira',
      email: 'toni@itentecnologia.com.br',
      password: 'Tonimoreira6'
    })
  }
}
