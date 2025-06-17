
export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      // 간단한 CSV 파싱 (쉼표로 구분)
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      result.push(values);
    }
  }
  
  return result;
};

export const generateCSV = (data: any[], headers: string[]): string => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // 쉼표나 따옴표가 있는 경우 따옴표로 감싸기
        return value.toString().includes(',') || value.toString().includes('"') 
          ? `"${value.toString().replace(/"/g, '""')}"` 
          : value.toString();
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
