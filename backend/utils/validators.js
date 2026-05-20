const validator = require('validator');

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateTADAForm = (data) => {
  const errors = [];

  if (!data.journey_purpose || data.journey_purpose.trim() === '') {
    errors.push('Journey purpose is required');
  }

  if (!data.project || data.project.trim() === '') {
    errors.push('Project is required');
  }

  if (!data.date_from || !data.date_to) {
    errors.push('Both date from and date to are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateBankDetails = (data) => {
  const errors = [];

  if (!data.account_name || data.account_name.trim() === '') {
    errors.push('Account holder name is required');
  }

  if (!data.bank_name || data.bank_name.trim() === '') {
    errors.push('Bank name is required');
  }

  if (!data.account_number || data.account_number.trim() === '') {
    errors.push('Account number is required');
  }

  if (!data.ifsc_code || data.ifsc_code.trim() === '') {
    errors.push('IFSC code is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateTADAForm,
  validateBankDetails
};
