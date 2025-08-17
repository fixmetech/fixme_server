const express = require("express");
const router = express.Router();
const {
  viewAllServiceCenters,
  addAppointment,
  editAppointment,
  deleteAppointment,
  viewAllAppointments,
  viewAppointmentById,
  viewAppointmentsInCalendar,
  addTask,
  editTask,
  deleteTask,
  viewAllTasks,
  ViewTaskByDate,
  addService,
  editService,
  deleteService,
  viewAllServices,
  viewServiceById,
  editProfile,
  getProfileById,
  deleteProfile,
  addProfile
} = require("../controllers/service.controller");

//get all service center details
router.get('/', viewAllServiceCenters);

//Appointment Management Routes
router.get('/:servicecenterid/appointment', viewAllAppointments);
router.post('/:servicecenterid/appointment', addAppointment);                  // Add appointment
router.patch('/:servicecenterid/appointment/:id', editAppointment);            // Edit appointment
router.delete('/:servicecenterid/appointment/:id', deleteAppointment);         // Delete appointment
router.get('/:servicecenterid/appointment/:id', viewAppointmentById);          // View specific appointment

//Calendar Management Routes
router.get('/:servicecenterid/calendar', viewAppointmentsInCalendar);
router.post('/:servicecenterid/calendar/task', addTask);                       // Add task
router.patch('/:servicecenterid/calendar/task/:id', editTask);                 // Edit task
router.delete('/:servicecenterid/calendar/task/:id', deleteTask);              // Delete task
router.get('/:servicecenterid/calendar/tasks', viewAllTasks);                  // View all tasks
router.get('/:servicecenterid/calendar/date', ViewTaskByDate);                 // View task by date (pass date as query param)

//Service Management Routes
router.get('/:servicecenterid/service', viewAllServices);
router.post('/:servicecenterid/service', addService);                          // Add service
router.patch('/:servicecenterid/service/:id', editService);                    // Edit service
router.delete('/:servicecenterid/service/:id', deleteService);                 // Delete service
router.get('/:servicecenterid/service/:id', viewServiceById);                  // View specific service

//Profile Management Routes 
router.patch('/profile/:id', editProfile);                  // Edit profile
router.get('/profile/:id', getProfileById);                 // Get profile
router.post('/profile', addProfile);                       //Add Profile
router.delete('/profile/:id', deleteProfile);             //Delete Profile

//Error Handling
router.use((error, req, res, next) => {
  console.error('Service Center route error:', error);
  res.status(500).json({
    success: false,
    error: 'An error occurred while processing your request.'
  });
});

module.exports = router;
