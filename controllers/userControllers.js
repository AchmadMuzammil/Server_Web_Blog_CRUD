const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const { v4: uuid } = require("uuid")

const User = require('../models/userModel')
const HttpError = require("../models/errorModel")


// ================REGISTER A NEW USER
// POST : api/users/register


// UNPROTECTED
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        if (!name || !email || !password) {
            return next(new HttpError("Fill In All Feileds.", 422))
        }

        const newEmail = email.toLowerCase()

        const emailExists = await User.findOne({ email: newEmail })
        if (emailExists) {
            return next(new HttpError("Email Already Exists.", 422))
        }

        if ((password.trim()).length < 6) {
            return next(new HttpError("Password Should Be At Least 6 Characters.", 422))
        }

        if (password != password2) {
            return next(new HttpError("Passwords Do Not Macth.", 422))
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt);
        const newUser = await User.create({ name, email: newEmail, password: hashedPass })
        res.status(201).json(`New User ${newUser.email} registered.`)
    } catch (error) {
        return next(new HttpError("User Register Failed.", 422))
    }
}



// ================LOGIN A REGISTER USER
// POST : api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new HttpError("Fill In All Fieleds.", 422))
        }

        const newEmail = email.toLowerCase();

        const user = await User.findOne({ email: newEmail })
        if (!user) {
            return next(new HttpError("Invalid Credentials.", 422))
        }

        const comparePass = await bcrypt.compare(password, user.password)
        if (!comparePass) {
            return next(new HttpError("Invalid credentials.", 422))
        }

        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" })

        res.status(200).json({ token, id, name })
    } catch (error) {
        return next(new HttpError("Login failed. Please Check Your Credentials.", 422))
    }
}



// ================USER PROFILE
// POST : api/users/:id
// UNPROTECTED
const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-password');
        if (!user) {
            return next(new HttpError("User not found.", 404))
        }
        res.status(200).json(user);
    } catch (error) {
        return next(new HttpError(error))
    }
}



// ================CHANGE USER AVATAR (profile picture)
// POST : api/users/change-avatar
// PROTECTED
const changeAvatra = async (req, res, next) => {
    try {
        if (!req.files.avatar) {
            return next(new HttpError("PLease Choose An Image.", 422))
        }

        // find user from database
        const user = await User.findById(req.user.id)
        // delete old avatar if exists
        if (user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    return next(new HttpError(err))
                }
            })
        }

        const { avatar } = req.files;
        // check file size
        if (avatar.size > 500000) {
            return next(new HttpError("Profile Picture Too Big. Should Be Less Than 500kb."), 422)
        }

        let fileName;
        fileName = avatar.name;
        let splittedFilename = fileName.split('.')
        let newFileName = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1]
        avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError(err))
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: newFileName }, { new: true })
            if (!updatedAvatar) {
                return next(new HttpError("Avatar Couldn't Be Changed.", 422))
            }
            res.status(200).json(updatedAvatar)
        })
    } catch (error) {
        return next(new HttpError(error))
    }
}



// ================EDIT USER DETAILS (form profile)
// POST : api/users/edit-user
// UNPROTECTED
const editUser = async (req, res, next) => {
    try {
        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;
        if (!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill In All Fields.", 422))
        }

        // get user from database
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError("User Not Found.", 403))
        }

        // Make Sure New Email Doesn't Already Exist
        const emailExist = await User.findOne({ email });
        // we want to update other details with/without changing the email (which is a unique id because we use it to login).
        if (emailExist && (emailExist.id != req.user.id)) {
            return next(new HttpError("Email Already Exist.", 422))
        }
        // Compare current password to db password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validateUserPassword) {
            return next(new HttpError("Invalid current password.", 422))
        }

        // compare new password
        if (newPassword !== confirmNewPassword) {
            return next(new HttpError("New Password Do Not Match.", 422))
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword, salt);

        // update user info n database
        const newInfo = await User.findByIdAndUpdate(req.user.id, { name, email, password: hash }, { new: true })
        res.status(200).json(newInfo)
    } catch (error) {
        return next(new HttpError(error))
    }
}



// ================GET AUTHORS
// POST : api/users/authors
// UNPROTECTED
const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select('-password');
        res.json(authors);
    } catch (error) {
        return next(new HttpError(error))

    }
}


module.exports = { registerUser, loginUser, getUser, changeAvatra, editUser, getAuthors }