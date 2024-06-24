const Post = require('../models/postModel')
const User = require('../models/userModel')
const path = require('path')
const fs = require('fs')
const { v4: uuid } = require('uuid')
const HttpError = require('../models/errorModel')
const { title } = require('process')



// ================CREATE A POST
// POST : api/posts
// PROTECTED
const createPosts = async (req, res, next) => {
    try {
        let { title, category, description } = req.body;
        if (!title || !category || !description || !req.files) {
            return next(new HttpError("Fill In All Fields And Choose Thumbanail.", 422))
        }
        const { thumbanail } = req.files;
        // check the file size
        if (thumbanail.size > 2000000) {
            return next(new HttpError("Thumbanail Too Big. File Should Be Less Than 2mb.", 422))
        }
        let fileName = thumbanail.name;
        let splittedFilename = fileName.split('.')
        let newFileName = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1]
        thumbanail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError(err))
            } else {
                const newPost = await Post.create({ title, category, description, thumbanail: newFileName, creator: req.user.id })
                if (!newPost) {
                    return next(new HttpError("Post Couldn't Be Created.", 422))
                }
                // find user and increate post count by 1
                const currentUser = await User.findById(req.user.id);
                const userPostCount = currentUser.posts + 1;
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })

                res.status(201).json(newPost)
            }
        })
    } catch (error) {
        return next(new HttpError(error))
    }
}




// ================GET ALL POST
// GET : api/posts
// PROTECTED
const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ updatedAt: -1 })
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}




// ================GET SINGLE POST
// GET : api/posts/:id
// UNPROTECTED
const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post No Found.", 404))
        }
        res.status(200).json(post)
    } catch (error) {
        return next(new HttpError(error))
    }
}





// ================GET POSTS BY CATEGORY
// GET : api/posts/categories/:category
// UNPROTECTED
const getCatPosts = async (req, res, next) => {
    try {
        const { category } = req.params;
        const catPosts = await Post.find({ category }).sort({ createdAt: -1 })
        res.status(200).json(catPosts)
    } catch (error) {
        return next(new HttpError(error))
    }
}





// ================GET USER/AUTHOR POST
// GET : api/posts/users/:id
// UNPROTECTED
const getUserPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 })
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}





// ================EDIT POST
// PACTH : api/posts/:id
// PROTECTED
const editPost = async (req, res, next) => {
    try {
        let fileName;
        let newFilename;
        let updatedPost;
        const postId = req.params.id;
        let { title, category, description } = req.body;
        // ReactQuill has a paragraph opening and closing tag with a break tag in between so there are 11
        // charagters in there already

        if (!title || !category || description.length < 12) {
            return next(new HttpError("Fill In All Fields.", 422))
        }
        // Get olde post from database
        const oldPost = await Post.findById(postId);
        if (req.user.id == oldPost.creator) {
            if (!req.files) {
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true })
            } else {
                // Delete old thumbanail from upload
                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbanail), async (err) => {
                    if (err) {
                        return next(new HttpError(err))
                    }
                })

                // upload new thumbanail
                const { thumbanail } = req.files;
                // check file size
                if (thumbanail.size > 2000000) {
                    return next(new HttpError("Thumbanail too big. Should be less than 2mb"))
                }
                fileName = thumbanail.name;
                let splittedFilename = fileName.split('.')
                newFilename = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1]
                thumbanail.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
                    if (err) {
                        return next(new HttpError(err))
                    }
                })

                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbanail: newFilename }, { new: true })

            }
        }

        if (!updatedPost) {
            return next(new HttpError("Couldn't update post.", 400))
        }

        res.status(200).json(updatedPost)
    } catch (error) {
        return next(new HttpError(error))
    }
}





// ================DELETE POST
// DELETE : api/posts/:id
// PROTECTED
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post Unavailable.", 400))
        }
        const post = await Post.findById(postId);
        const fileName = post?.thumbanail;
        if (req.user.id == post.creator) {
            // delete thumbanail from uploads folder
            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError(err))
                } else {
                    await Post.findByIdAndDelete(postId);
                    // find use and reduce post count by 1
                    const currentUser = await User.findById(req.user.id);
                    const userPostCount = currentUser?.posts - 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })
                }
            })
        } else {
            return next(new HttpError("Post Couldn't be deleted.", 403))
        }

        res.json(`Post ${postId} delete successsfully.`)
    } catch (error) {
        return next(new HttpError(err))
    }
}



module.exports = { createPosts, editPost, getCatPosts, getPost, getPosts, getUserPosts, deletePost }