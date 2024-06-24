const {Router} = require('express')

const router = Router()

const {createPosts, editPost, getCatPosts, getPost, getPosts, getUserPosts, deletePost} = require('../controllers/postController')
const authMiddleware = require('../middleware/authMiddleware')



router.post('/', authMiddleware, createPosts)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getCatPosts)
router.get('/users/:id', getUserPosts)
router.patch('/:id', authMiddleware, editPost)
router.delete('/:id', authMiddleware, deletePost)


module.exports = router