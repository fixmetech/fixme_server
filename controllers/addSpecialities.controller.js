const {db} = require('../firebase');
const Technician = require('../models/technician.model');


const collection = db.collection('technicians');

//Add a new speciality to a technician

const addSpecialityToTechnician = async (req, res) => {
    try {
        const { technicianId } = req.params;
        const { speciality } = req.body;

        // Validate technicianId
        if (!technicianId || typeof technicianId !== 'string' || technicianId.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Invalid technician ID'
            });
        }

        // Validate speciality
        if (!speciality || typeof speciality !== 'string' || speciality.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Speciality is required and must be a non-empty string'
            });
        }

        const docRef = collection.doc(technicianId.trim());
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Technician not found' });
        }
        const technicianData = doc.data();
        const specializations = technicianData.specializations || [];

        // Check if speciality already exists
        if (specializations.includes(speciality)) {
            return res.status(400).json({ 
                error: 'This speciality already exists for this technician'
            });
        }

        // Add new speciality to array using arrayUnion to ensure atomic update
        await docRef.update({
            specializations: [...specializations, speciality],
            updatedAt: new Date()
        });

        res.status(200).json({ 
            success: true,
            message: 'Speciality added successfully', 
            technicianId, 
            speciality,
            specializations: [...specializations, speciality]
        });
    
        
    } catch (error) {
        res.status(500).json({ error: error.message });

        
    }
}

module.exports = {
    addSpecialityToTechnician
};