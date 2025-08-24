package com.goldenstore.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import org.json.JSONObject;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * SMS RECEIVER FOR MCB BANKING MESSAGES
 * =====================================
 * 
 * Automatically intercepts incoming SMS messages and parses MCB banking notifications
 */
public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";
    private static final String MCB_SENDER = "MCB";
    
    // MCB SMS patterns for different transaction types
    private static final Pattern RECEIVED_PATTERN = Pattern.compile(
        "MCB:\\s*Rs\\s*([\\d,]+\\.\\d{2})\\s*received\\s*from\\s*([A-Z\\s]+)\\s*Ref:\\s*(\\d+)\\s*Bal:\\s*Rs\\s*([\\d,]+\\.\\d{2})",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern SENT_PATTERN = Pattern.compile(
        "MCB:\\s*Rs\\s*([\\d,]+\\.\\d{2})\\s*sent\\s*to\\s*([A-Z\\s]+)\\s*Ref:\\s*(\\d+)\\s*Bal:\\s*Rs\\s*([\\d,]+\\.\\d{2})",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern WITHDRAWAL_PATTERN = Pattern.compile(
        "MCB:\\s*Rs\\s*([\\d,]+\\.\\d{2})\\s*withdrawn\\s*.*Bal:\\s*Rs\\s*([\\d,]+\\.\\d{2})",
        Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                        String sender = smsMessage.getDisplayOriginatingAddress();
                        String messageBody = smsMessage.getDisplayMessageBody();
                        
                        Log.d(TAG, "SMS received from: " + sender);
                        Log.d(TAG, "Message: " + messageBody);
                        
                        // Check if it's from MCB
                        if (sender != null && (sender.contains("MCB") || sender.contains("6060"))) {
                            processMcbMessage(context, messageBody);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Process MCB banking message and extract transaction details
     */
    private void processMcbMessage(Context context, String message) {
        try {
            JSONObject transaction = parseMcbMessage(message);
            if (transaction != null) {
                // Send to web app via JavaScript interface
                sendToWebApp(context, transaction);
                
                // Store locally for offline access
                storeTransaction(context, transaction);
                
                Log.d(TAG, "MCB transaction processed: " + transaction.toString());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing MCB message", e);
        }
    }
    
    /**
     * Parse MCB message and extract transaction details
     */
    private JSONObject parseMcbMessage(String message) {
        try {
            JSONObject transaction = new JSONObject();
            transaction.put("timestamp", System.currentTimeMillis());
            transaction.put("rawMessage", message);
            
            // Try to match money received pattern
            Matcher receivedMatcher = RECEIVED_PATTERN.matcher(message);
            if (receivedMatcher.find()) {
                transaction.put("type", "RECEIVED");
                transaction.put("amount", parseAmount(receivedMatcher.group(1)));
                transaction.put("fromName", receivedMatcher.group(2).trim());
                transaction.put("reference", receivedMatcher.group(3));
                transaction.put("balance", parseAmount(receivedMatcher.group(4)));
                return transaction;
            }
            
            // Try to match money sent pattern
            Matcher sentMatcher = SENT_PATTERN.matcher(message);
            if (sentMatcher.find()) {
                transaction.put("type", "SENT");
                transaction.put("amount", parseAmount(sentMatcher.group(1)));
                transaction.put("toName", sentMatcher.group(2).trim());
                transaction.put("reference", sentMatcher.group(3));
                transaction.put("balance", parseAmount(sentMatcher.group(4)));
                return transaction;
            }
            
            // Try to match withdrawal pattern
            Matcher withdrawalMatcher = WITHDRAWAL_PATTERN.matcher(message);
            if (withdrawalMatcher.find()) {
                transaction.put("type", "WITHDRAWAL");
                transaction.put("amount", parseAmount(withdrawalMatcher.group(1)));
                transaction.put("balance", parseAmount(withdrawalMatcher.group(2)));
                return transaction;
            }
            
            // If no pattern matches, store as unknown MCB message
            transaction.put("type", "UNKNOWN");
            return transaction;
            
        } catch (Exception e) {
            Log.e(TAG, "Error parsing MCB message", e);
            return null;
        }
    }
    
    /**
     * Parse amount string and remove commas
     */
    private double parseAmount(String amountStr) {
        if (amountStr == null) return 0.0;
        return Double.parseDouble(amountStr.replace(",", ""));
    }
    
    /**
     * Send transaction to web app via JavaScript interface
     */
    private void sendToWebApp(Context context, JSONObject transaction) {
        // This will be called from MainActivity to send to WebView
        Intent intent = new Intent("com.goldenstore.app.NEW_TRANSACTION");
        intent.putExtra("transaction", transaction.toString());
        context.sendBroadcast(intent);
    }
    
    /**
     * Store transaction locally for offline access
     */
    private void storeTransaction(Context context, JSONObject transaction) {
        // Store in SharedPreferences or local database
        // Implementation depends on your storage preference
    }
}