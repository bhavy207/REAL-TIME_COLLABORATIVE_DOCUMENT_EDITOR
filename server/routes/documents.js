const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a new document
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const document = new Document({
      title,
      // Stringify content before saving
      content: JSON.stringify(content),
      owner: req.user._id
    });
    await document.save();
    
    // Update user's documents array using the static method
    await User.updateDocuments(req.user._id, { $push: { documents: document._id } });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
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
    
    // Parse content for each document safely
    const parsedDocuments = documents.map(doc => {
      let parsedContent = { ops: [{ insert: '\n' }] }; // Default empty content
      try {
        if (doc.content) {
          parsedContent = JSON.parse(doc.content);
        }
      } catch (parseError) {
        console.error(`Error parsing content for document ${doc._id}:`, parseError);
        // Keep default empty content if parsing fails
      }
      return {
        ...doc.toObject(),
        content: parsedContent
      };
    });

    res.json(parsedDocuments);
  } catch (error) {
    console.error('Error getting documents:', error);
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
    
    // Parse content safely before sending
    let parsedContent = { ops: [{ insert: '\n' }] };
    try {
      if (document.content) {
        parsedContent = JSON.parse(document.content);
      }
    } catch (parseError) {
      console.error(`Error parsing content for document ${document._id}:`, parseError);
      // Keep default empty content if parsing fails
    }

    const parsedDocument = {
      ...document.toObject(),
      content: parsedContent
    };

    res.json(parsedDocument);
  } catch (error) {
    console.error('Error getting specific document:', error);
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

    // Explicitly handle content to ensure it's stringified
    if (req.body.content !== undefined) {
      if (typeof req.body.content !== 'string') {
        document.content = JSON.stringify(req.body.content);
      } else {
        document.content = req.body.content;
      }
      // Remove content from req.body so Object.assign doesn't overwrite with original type
      delete req.body.content;
    }

    Object.assign(document, req.body);
    document.version += 1;
    document.lastModified = new Date();
    await document.save();
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
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

    // Update user's documents array using the static method
    await User.updateDocuments(req.user._id, { $pull: { documents: req.params.id } });

    res.json(document);
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add collaborator
router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { collaboratorEmail } = req.body;
    
    // Find the user by email
    const collaborator = await User.findOne({ email: collaboratorEmail });
    if (!collaborator) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a collaborator
    if (document.collaborators.includes(collaborator._id)) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    // Add user to collaborators
    document.collaborators.push(collaborator._id);
    await document.save();

    // Add document to collaborator's documents list using the static method
    await User.updateDocuments(collaborator._id, { $push: { documents: document._id } });

    // Fetch the updated document with populated collaborators
    const updatedDocument = await Document.findById(document._id)
      .populate('collaborators', 'email username')
      .populate('owner', 'email username');

    // Parse content before sending
    const parsedUpdatedDocument = {
      ...updatedDocument.toObject(),
      content: updatedDocument.content ? JSON.parse(updatedDocument.content) : { ops: [{ insert: '\n' }] }
    };

    res.json({
      message: 'Collaborator added successfully',
      document: parsedUpdatedDocument
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 