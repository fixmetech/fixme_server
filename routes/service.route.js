const express = require("express");
const router = express.Router();
const {
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
  viewServiceById

} = require("../controllers/service.controller");

// Appointment management routes
router.get('/appointment', viewAllAppointments);
router.get('/appointment/add', addAppointment);
router.get('/appointment/edit:id', editAppointment);
router.patch('/appointment/delete:id', deleteAppointment);
router.patch('/appointment/view:id', viewAppointmentById);

// calendar management routes
router.get('/calendar', viewAppointmentsInCalendar);
router.get('/calendar/add', addTask);
router.get('/calendar/edit:id', editTask);
router.patch('/calendar/delete:id', deleteTask);
router.patch('/calendar/view', viewAllTasks);
router.patch('/calendar/date', ViewTaskByDate);

//service management routes
router.get('/service', viewAllServices);
router.get('/service/add', addService);
router.get('/service/edit:id', editService);
router.patch('/service/delete:id', deleteService);
router.patch('/service/view:id', viewServiceById);


// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Service Center route error:', error);
  res.status(500).json({
    success: false,
    error: 'An error occurred while processing your request.'
  });
});

module.exports = router;
