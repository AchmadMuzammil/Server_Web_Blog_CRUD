const { Router } = require('express')

const {
    registerUser,
    loginUser,
    getUser,
    changeAvatra,
    editUser,
    getAuthors
} = require("../controllers/userControllers")
const authMiddleware = require('../middleware/authMiddleware')


const router = Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/:id', getUser)
router.get('/', getAuthors)
router.post('/change-avatar', authMiddleware, changeAvatra)
router.patch('/edit-user', authMiddleware, editUser)



module.exports = router