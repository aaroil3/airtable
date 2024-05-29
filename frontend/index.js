import { initializeBlock, useBase, useRecords, Button, Box, FormField, Select } from '@airtable/blocks/ui';
import React, { useState, useEffect } from 'react';

function MyCustomBlock() {
    const base = useBase();
    const sourceTable = base.getTable('Table 1'); // שם הטבלה ממנה רוצים להעתיק
    const targetTable = base.getTable('Table 3'); // שם הטבלה אליה רוצים להעתיק
    const linkTable = base.getTable('Table 4'); // טבלת הקישור
    const additionalLinkTable = base.getTable('Table 5'); // טבלת הקישור הנוספת

    const linkRecords = useRecords(linkTable);
    const additionalLinkRecords = useRecords(additionalLinkTable);

    const [statusMessage, setStatusMessage] = useState('');
    const [linkedRecordId, setLinkedRecordId] = useState('');
    const [additionalLinkedRecordId, setAdditionalLinkedRecordId] = useState('');

    // בדיקת נתונים בקונסול
    useEffect(() => {
        console.log("Link Table Records:", linkRecords);
        console.log("Additional Link Table Records:", additionalLinkRecords);
    }, [linkRecords, additionalLinkRecords]);

    async function handleCopyRecords() {
        try {
            const linkedRecord = linkRecords.getRecordById(linkedRecordId);
            if (!linkedRecord) {
                setStatusMessage('No record was selected from Table 4.');
                return;
            }

            const additionalLinkedRecord = additionalLinkRecords.getRecordById(additionalLinkedRecordId);
            if (!additionalLinkedRecord) {
                setStatusMessage('No record was selected from Table 5.');
                return;
            }

            // קריאת רשומות מהטבלה המקורית
            const recordsToCopy = await sourceTable.selectRecordsAsync();

            let count = 0;
            // יצירת רשומות בטבלה היעד עם הקישור לרשומה שנבחרה
            for (let record of recordsToCopy.records) {
                if (record.getCellValue('Checkbox Field')) {
                    let fieldsToCopy = {};
                    // לולאה על כל השדות ברשומה, מעתיקים כל אחד מהם פרט ל'Checkbox Field'
                    for (let field of sourceTable.fields) {
                        if (field.name !== 'Checkbox Field' && record.getCellValue(field) !== null) {
                            fieldsToCopy[field.name] = record.getCellValue(field);
                        }
                    }

                    // הוספת הקישורים
                    fieldsToCopy['Linked Field'] = [{ id: linkedRecord.id }];
                    fieldsToCopy['Linked Field 2'] = [{ id: additionalLinkedRecord.id }];

                    await targetTable.createRecordAsync(fieldsToCopy);
                    count++;
                }
            }

            setStatusMessage(`Total records copied and linked: ${count}`);

            // שאלה למשתמש האם למחוק את הרשומות מהטבלה המקורית
            const deleteRecords = window.confirm('Do you want to delete all records from the source table?');

            if (deleteRecords) {
                const currentRecords = await sourceTable.selectRecordsAsync(); // קריאה חוזרת של הרשומות
                const currentRecordIds = new Set(currentRecords.records.map(r => r.id)); // הכנסת כל המזהים ל-Set לחיפוש מהיר

                let recordsToDelete = recordsToCopy.records.filter(r => currentRecordIds.has(r.id)); // פילטר רק לרשומות שעדיין קיימות

                // מחיקת כל הרשומות מהטבלה המקורית בצעדים
                while (recordsToDelete.length > 0) {
                    await sourceTable.deleteRecordsAsync(recordsToDelete.slice(0, 50));
                    recordsToDelete = recordsToDelete.slice(50);
                }
                setStatusMessage('All records have been deleted from the source table.');
            } else {
                setStatusMessage('No records were deleted from the source table.');
            }
        } catch (error) {
            setStatusMessage(`Error: ${error.message}`);
        }
    }

    return (
        <Box padding={2}>
            <FormField label="Select a record to link from Table 4">
                {linkRecords && linkRecords.records && linkRecords.records.length > 0 ? (
                    <Select
                        options={linkRecords.records.map(record => ({ label: record.name, value: record.id }))}
                        value={linkedRecordId}
                        onChange={newValue => setLinkedRecordId(newValue)}
                        width="320px"
                    />
                ) : (
                    <div>No records available in Table 4</div>
                )}
            </FormField>
            <FormField label="Select a record to link from Table 5">
                {additionalLinkRecords && additionalLinkRecords.records && additionalLinkRecords.records.length > 0 ? (
                    <Select
                        options={additionalLinkRecords.records.map(record => ({ label: record.name, value: record.id }))}
                        value={additionalLinkedRecordId}
                        onChange={newValue => setAdditionalLinkedRecordId(newValue)}
                        width="320px"
                    />
                ) : (
                    <div>No records available in Table 5</div>
                )}
            </FormField>
            <Button onClick={handleCopyRecords} variant="primary">
                Copy Records
            </Button>
            <div>{statusMessage}</div>
        </Box>
    );
}

initializeBlock(() => <MyCustomBlock />);
