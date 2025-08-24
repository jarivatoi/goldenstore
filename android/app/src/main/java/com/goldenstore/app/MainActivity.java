@@ .. @@
 package com.goldenstore.app;

+import android.content.BroadcastReceiver;
+import android.content.Context;
+import android.content.Intent;
+import android.content.IntentFilter;
+import android.content.pm.PackageManager;
+import android.os.Bundle;
+import android.webkit.JavascriptInterface;
+import android.webkit.WebView;
+import android.widget.Toast;
+import androidx.core.app.ActivityCompat;
+import androidx.core.content.ContextCompat;
+import android.Manifest;
 import com.getcapacitor.BridgeActivity;
+import org.json.JSONObject;

-public class MainActivity extends BridgeActivity {}
+public class MainActivity extends BridgeActivity {
+    private static final int SMS_PERMISSION_REQUEST = 1001;
+    private WebView webView;
+    private BroadcastReceiver transactionReceiver;
+    
+    @Override
+    public void onCreate(Bundle savedInstanceState) {
+        super.onCreate(savedInstanceState);
+        
+        // Request SMS permissions
+        requestSmsPermissions();
+        
+        // Set up transaction receiver
+        setupTransactionReceiver();
+        
+        // Add JavaScript interface to bridge
+        getBridge().getWebView().addJavascriptInterface(new SmsJavaScriptInterface(), "AndroidSMS");
+    }
+    
+    /**
+     * Request SMS reading permissions
+     */
+    private void requestSmsPermissions() {
+        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) 
+            != PackageManager.PERMISSION_GRANTED ||
+            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) 
+            != PackageManager.PERMISSION_GRANTED) {
+            
+            ActivityCompat.requestPermissions(this, 
+                new String[]{
+                    Manifest.permission.RECEIVE_SMS,
+                    Manifest.permission.READ_SMS
+                }, 
+                SMS_PERMISSION_REQUEST);
+        }
+    }
+    
+    /**
+     * Set up broadcast receiver for new transactions
+     */
+    private void setupTransactionReceiver() {
+        transactionReceiver = new BroadcastReceiver() {
+            @Override
+            public void onReceive(Context context, Intent intent) {
+                if ("com.goldenstore.app.NEW_TRANSACTION".equals(intent.getAction())) {
+                    String transactionJson = intent.getStringExtra("transaction");
+                    if (transactionJson != null) {
+                        // Send to web app
+                        String jsCode = "window.handleNewBankingTransaction(" + transactionJson + ");";
+                        getBridge().getWebView().evaluateJavascript(jsCode, null);
+                        
+                        // Show notification
+                        try {
+                            JSONObject transaction = new JSONObject(transactionJson);
+                            String type = transaction.getString("type");
+                            double amount = transaction.getDouble("amount");
+                            
+                            if ("RECEIVED".equals(type)) {
+                                String fromName = transaction.getString("fromName");
+                                Toast.makeText(context, 
+                                    "💰 Rs " + String.format("%.2f", amount) + " received from " + fromName, 
+                                    Toast.LENGTH_LONG).show();
+                            }
+                        } catch (Exception e) {
+                            // Ignore parsing errors for notifications
+                        }
+                    }
+                }
+            }
+        };
+        
+        IntentFilter filter = new IntentFilter("com.goldenstore.app.NEW_TRANSACTION");
+        registerReceiver(transactionReceiver, filter);
+    }
+    
+    @Override
+    protected void onDestroy() {
+        super.onDestroy();
+        if (transactionReceiver != null) {
+            unregisterReceiver(transactionReceiver);
+        }
+    }
+    
+    @Override
+    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
+        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
+        
+        if (requestCode == SMS_PERMISSION_REQUEST) {
+            boolean allGranted = true;
+            for (int result : grantResults) {
+                if (result != PackageManager.PERMISSION_GRANTED) {
+                    allGranted = false;
+                    break;
+                }
+            }
+            
+            if (allGranted) {
+                Toast.makeText(this, "SMS permissions granted! Banking notifications enabled.", Toast.LENGTH_LONG).show();
+            } else {
+                Toast.makeText(this, "SMS permissions required for banking notifications", Toast.LENGTH_LONG).show();
+            }
+        }
+    }
+    
+    /**
+     * JavaScript interface for SMS functionality
+     */
+    public class SmsJavaScriptInterface {
+        @JavascriptInterface
+        public boolean isSmsPermissionGranted() {
+            return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECEIVE_SMS) 
+                == PackageManager.PERMISSION_GRANTED &&
+                ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_SMS) 
+                == PackageManager.PERMISSION_GRANTED;
+        }
+        
+        @JavascriptInterface
+        public void requestSmsPermissions() {
+            runOnUiThread(() -> {
+                requestSmsPermissions();
+            });
+        }
+        
+        @JavascriptInterface
+        public String getRecentMcbMessages() {
+            // Implementation to read recent SMS messages from MCB
+            // Returns JSON array of recent banking messages
+            return "[]"; // Placeholder
+        }
+    }
+}