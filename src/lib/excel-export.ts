interface ExcelColumn {
  header: string
  width: number
  format?: string
}

interface ExcelRow {
  values: (string | number)[]
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateExcelXml(
  columns: ExcelColumn[],
  rows: ExcelRow[],
  sheetName = 'Relatorio',
): string {
  const headerCells = columns
    .map(
      (col, idx) =>
        `<Cell ss:StyleID="HeaderCell" ss:Index="${idx + 1}"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`,
    )
    .join('')

  const dataRows = rows
    .map((row) => {
      const cells = row.values
        .map((val, idx) => {
          const col = columns[idx]
          if (typeof val === 'number') {
            return `<Cell ss:StyleID="DataCell${col.format ? col.format : ''}" ss:Index="${idx + 1}"><Data ss:Type="Number">${val}</Data></Cell>`
          }
          return `<Cell ss:StyleID="DataCell" ss:Index="${idx + 1}"><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const colDefinitions = columns.map((col) => `<Column ss:Width="${col.width}" />`).join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Calibri" ss:Size="11" />
  </Style>
  <Style ss:ID="HeaderCell">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF" />
   <Interior ss:Color="#225F3D" ss:Pattern="Solid" />
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Font ss:FontName="Calibri" ss:Size="11" />
  </Style>
  <Style ss:ID="DataCellCurrency">
   <Font ss:FontName="Calibri" ss:Size="11" />
   <NumberFormat ss:Format='"R$ "#,##0.00' />
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   ${colDefinitions}
   <Row>${headerCells}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`
}

export function downloadExcelFile(
  columns: ExcelColumn[],
  rows: ExcelRow[],
  filename: string,
  sheetName?: string,
): void {
  const xmlContent = generateExcelXml(columns, rows, sheetName)
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
