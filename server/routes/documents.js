const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a new document
router.post('/', auth, async (req, res) => {
  try {
    const document = new Document({
      ...req.body,
      owner: req.user._id
    });
    await document.save();
    req.user.documents.push(document._id);
    await req.user.save();
    res.status(201).json(document);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all documents for the current user
router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    }).populate('owner', 'username email')
      .populate('collaborators', 'username email');
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific document
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    }).populate('owner', 'username email')
      .populate('collaborators', 'username email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a document
router.patch('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    Object.assign(document, req.body);
    document.version += 1;
    document.lastModified = new Date();
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    req.user.documents = req.user.documents.filter(
      docId => docId.toString() !== req.params.id
    );
    await req.user.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add collaborator
router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    console.log('Adding collaborator to document:', req.params.id);
    console.log('Current user:', req.user._id);
    console.log('Collaborator email:', req.body.collaboratorEmail);

    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!document) {
      console.log('Document not found or user is not owner');
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log('Found document:', document._id);
    console.log('Current collaborators:', document.collaborators);

    const { collaboratorEmail } = req.body;
    
    // Find the user by email
    const collaborator = await User.findOne({ email: collaboratorEmail });
    if (!collaborator) {
      console.log('Collaborator user not found');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Found collaborator:', collaborator._id);
    console.log('Collaborator current documents:', collaborator.documents);

    // Check if user is already a collaborator
    if (document.collaborators.includes(collaborator._id)) {
      console.log('User is already a collaborator');
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    // Add user to collaborators
    document.collaborators.push(collaborator._id);
    await document.save();
    console.log('Added collaborator to document');

    // Add document to collaborator's documents list
    collaborator.documents.push(document._id);
    await collaborator.save();
    console.log('Added document to collaborator\'s documents');

    // Fetch the updated document with populated collaborators
    const updatedDocument = await Document.findById(document._id)
      .populate('collaborators', 'email username')
      .populate('owner', 'email username');

    res.json({
      message: 'Collaborator added successfully',
      document: updatedDocument
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 