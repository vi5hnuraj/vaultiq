'use client';
import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetadataPreviewCardProps {
    extractedMetadata: any;
    selectedFile: File | null;
    isReadyToMint: boolean;
    setExtractedMetadata: React.Dispatch<React.SetStateAction<any>>;
}

export default function ExtractedMetadata({
    extractedMetadata,
    selectedFile,
    isReadyToMint,
    setExtractedMetadata,
}: MetadataPreviewCardProps) {
    const [customerName, setCustomerName] = useState<string>('');
    const [customerInput, setCustomerInput] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [issueDate, setIssueDate] = useState<string>('');
    const [dueDateMatchError, setDueDateMatchError] = useState<boolean>(false);
    const [dateMatchError, setDateMatchError] = useState<boolean>(false);
    const [dateError, setDateError] = useState<string>('');
     
    useEffect(() => {
        if (extractedMetadata?.customerName) {
            setCustomerInput(extractedMetadata.customerName);
        }
        if (extractedMetadata?.invoiceDate && extractedMetadata.invoiceDate !== "Not Found") {
            setIssueDate(extractedMetadata.invoiceDate);
        }
        if (extractedMetadata?.scannedDueDate && extractedMetadata.scannedDueDate !== "Not Found") {
            setDueDate(extractedMetadata.scannedDueDate);
        }
    }, [extractedMetadata]);

    const handleSetCustomer = () => {
        if (!customerInput.trim() || !dueDate.trim() || !issueDate.trim()) return;

        const issue = new Date(issueDate);
        const due = new Date(dueDate);

        // 🛡️ DOUBLE-DATE VALIDATION:
        const normalizedIssue = issueDate.trim();
        const normalizedDue = dueDate.trim();
        const scannedIssue = (extractedMetadata?.invoiceDate || "").trim();
        const scannedDue = (extractedMetadata?.scannedDueDate || "").trim();

        // 1. Issuance Date match
        if (scannedIssue && scannedIssue !== "Not Found") {
            if (normalizedIssue !== scannedIssue) {
                setDateError(`Issue date (${normalizedIssue}) mismatch with scan (${scannedIssue}).`);
                setDateMatchError(true);
                return;
            }
        }
        // 2. Due Date match
        if (scannedDue && scannedDue !== "Not Found") {
            if (normalizedDue !== scannedDue) {
                setDateError(`Due date (${normalizedDue}) mismatch with scan (${scannedDue}).`);
                setDueDateMatchError(true);
                return;
            }
        }
        // 3. Chronology check
        if (issue >= due) {
            setDateError('Issue date must be before due date.');
            return;
        }

        setCustomerName(customerInput.trim());
        setDateError('');
        setDateMatchError(false);
        setDueDateMatchError(false);

        setExtractedMetadata((prev: any) => ({
            ...prev,
            customerName: customerInput.trim(),
            dueDate,
            issueDate,
        }));
    };

    return (
        <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
                <CardTitle>Metadata Preview</CardTitle>
                <CardDescription className="text-slate-400">
                    Verify extracted data before minting.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {extractedMetadata ? (
                    <div className="space-y-4 text-sm">
                        <div className="flex flex-col gap-2 bg-blue-400/10 p-2 rounded border border-blue-400/20 text-[10px] text-blue-400">
                           <div className="flex justify-between items-center ">
                                <span className="font-bold uppercase tracking-wider">Scanned Issue Date:</span>
                                <span>{extractedMetadata.invoiceDate || 'Not found'}</span>
                           </div>
                           <div className="flex justify-between items-center ">
                                <span className="font-bold uppercase tracking-wider">Scanned Due Date:</span>
                                <span>{extractedMetadata.scannedDueDate || 'Not found'}</span>
                           </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <Label className="text-slate-400">Amount</Label>
                            <p className="font-medium text-lg text-green-400">
                                {extractedMetadata.convertedAmount
                                    ? `${extractedMetadata.convertedAmount} ${extractedMetadata.preferredToken || 'USDC'}`
                                    : `${extractedMetadata.amount} USDC`}
                            </p>
                        </div>

                        {/* Issue Date Input */}
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-400 min-w-24">Issue Date</Label>
                            {!isReadyToMint ? (
                                <Input
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => {
                                        setIssueDate(e.target.value);
                                        setDateError('');
                                        setDateMatchError(false);
                                    }}
                                    className={`bg-slate-800 w-1/2 border-white/20 text-white ${dateMatchError ? 'border-red-500 focus:ring-red-500' : ''}`}
                                />
                            ) : (
                                <p className="text-white">
                                  {extractedMetadata?.issueDate || issueDate}
                                </p>
                            )}
                        </div>

                        {/* Due Date Input */}
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-400 min-w-24">Due Date</Label>
                            {!isReadyToMint ? (
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => {
                                        setDueDate(e.target.value);
                                        setDateError('');
                                        setDueDateMatchError(false);
                                    }}
                                    className={`bg-slate-800 w-1/2 border-white/20 text-white ${dueDateMatchError ? 'border-red-500 focus:ring-red-500' : ''}`}
                                />
                            ) : (
                                <p className="text-white">
                                  {extractedMetadata?.dueDate || dueDate}
                                </p>
                            )}
                        </div>

                        {dateError && (
                            <div className="text-[10px] text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                {dateError}
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <Label className="text-slate-400 min-w-24">Customer</Label>
                            {!isReadyToMint ? (
                                <Input
                                    value={customerInput}
                                    onChange={(e) => setCustomerInput(e.target.value)}
                                    placeholder="Enter customer name"
                                    className="bg-slate-800 w-1/2 border-white/20 text-white"
                                />
                            ) : (
                                <p className="text-white">
                                  {extractedMetadata?.customerName || customerInput}
                                </p>
                            )}
                        </div>
                        
                        <Button
                            onClick={handleSetCustomer}
                            variant="secondary"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            disabled={!customerInput.trim() || !dueDate.trim() || !issueDate.trim() || (extractedMetadata?.invoiceDate && issueDate !== extractedMetadata.invoiceDate)}
                        >
                            SET PROPERTIES
                        </Button>
                        {isReadyToMint ? (
                            <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center text-green-400">
                                <CheckCircle className="h-5 w-5" />
                                <p className="font-medium">Ready to Mint</p>
                            </div>
                        ) : (
                            <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center text-yellow-400 text-xs">
                                <AlertCircle className="h-4 w-4" />
                                <p className="font-medium">Verify and set properties to continue</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-14 text-slate-500">
                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                                <Clock className="h-8 w-8 animate-spin" />
                                <p>Extracting metadata...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8" />
                                <p>Upload an invoice to see a preview</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
