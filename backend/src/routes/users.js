const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', usersController.list);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.remove);

module.exports = router;
