class Sanitizer {

  static sanitizeData(data) {
    if (!data || data.length === 0) {
      return [];
    }

    const normalizedHeadersData = data.map(row => this.normalizeHeaders(row));
    const cleanedData = normalizedHeadersData.map(row => {
      const newRow = { ...row };
      for (const key in newRow) {
        if (typeof newRow[key] === 'string') {
          const cleanedName = this.cleanName(newRow[key]);
          newRow[key] = this.toTitleCase(cleanedName);
        }
      }
      return newRow;
    });

    return cleanedData;
  }

  static normalizeHeaders(row) {
    const newRow = {};
    const emailRegex = /email|correo/i;
    for (const key in row) {
      if (emailRegex.test(key)) {
        newRow['email'] = row[key];
      } else {
        newRow[key] = row[key];
      }
    }
    return newRow;
  }

  static cleanName(name) {
    const titleRegex = /(Ing|Lic|Dr|Dra|Sr|Sra|Ingeniero|Licenciado|Mtro|Mtra)\.?\s+/gi;
    const initialRegex = /\s[A-Z]\.\s/g;
    return name.replace(titleRegex, '').replace(initialRegex, ' ');
  }
  
  static toTitleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

module.exports = Sanitizer;
