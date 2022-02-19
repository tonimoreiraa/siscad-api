/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.post('/auth/register', 'AuthController.register')
Route.post('/auth/login', 'AuthController.login')

Route.post('/documents/:documentId/sign', 'DocumentsController.sign')
Route.get('/documents/:documentId/signatures/:signatureId', 'DocumentsController.downloadWithSignature')
Route.resource('/documents', 'DocumentsController').only(['show'])

Route.group(() => {
  Route.resource('/documents', 'DocumentsController').only(['store', 'update', 'index', 'destroy'])
  Route.delete('/documents/:documentId/signatures/:id', 'DocumentsController.destroySignature')
  Route.resource('/users', 'UsersController').only(['index', 'store', 'show', 'destroy'])
  Route.post('/users/:id/change-password', 'UsersController.changePassword')
}).middleware('auth')