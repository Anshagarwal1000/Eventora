const express=require('express')
const router=express();
const {protect,admin}=require('../middlewares/auth.js')
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController.js');


router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', protect, admin, createEvent);
router.put('/:id', protect, admin, updateEvent);
router.delete('/:id', protect, admin, deleteEvent);

module.exports = router;


    