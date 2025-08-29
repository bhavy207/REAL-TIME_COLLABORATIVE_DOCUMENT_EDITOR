const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }]
}, {
  timestamps: true,
  validateBeforeSave: false // Disable validation before save
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip validation if only documents array is modified
  if (this.isModified('documents') && !this.isModified('username') && !this.isModified('email') && !this.isModified('password')) {
    return next();
  }

  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to update documents without validation
userSchema.statics.updateDocuments = async function(userId, update) {
  return this.findByIdAndUpdate(
    userId,
    update,
    { 
      new: true,
      runValidators: false,
      context: 'query'
    }
  );
};

module.exports = mongoose.model('User', userSchema); 