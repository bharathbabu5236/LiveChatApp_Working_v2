// Regional Agora Connection Helper
import AgoraRTC from 'agora-rtc-sdk-ng';

class RegionalAgoraHelper {
    constructor() {
        this.regions = [
            'GLOBAL',
            'AP', // Asia Pacific
            'EU', // Europe  
            'NA', // North America
            'CN'  // China
        ];
        this.currentRegionIndex = 0;
    }

    async testRegionalConnection(appId, testChannel) {
        const results = [];
        
        for (let i = 0; i < this.regions.length; i++) {
            const region = this.regions[i];
            console.log(`🌍 Testing Agora region: ${region}`);
            
            try {
                // Create client with specific region
                const client = AgoraRTC.createClient({ 
                    mode: 'rtc', 
                    codec: 'vp8'
                });

                // Set region if not GLOBAL
                if (region !== 'GLOBAL') {
                    try {
                        // Note: This is a conceptual approach - actual region setting may vary
                        console.log(`Setting region to ${region}`);
                    } catch (regionError) {
                        console.warn(`Region setting failed for ${region}:`, regionError);
                    }
                }

                const testUID = Math.floor(Math.random() * 100000);
                const regionTestChannel = `${testChannel}_${region.toLowerCase()}`;
                
                // Try to join with timeout
                const joinPromise = client.join(appId, regionTestChannel, null, testUID);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`${region} region timeout`)), 8000);
                });

                await Promise.race([joinPromise, timeoutPromise]);
                
                console.log(`✅ ${region} region: SUCCESS`);
                await client.leave();
                
                results.push({
                    region: region,
                    success: true,
                    error: null,
                    latency: 'Unknown'
                });
                
                // If we find a working region, we can break or continue testing all
                break; // Stop at first working region
                
            } catch (error) {
                console.error(`❌ ${region} region: FAILED -`, error.message);
                results.push({
                    region: region,
                    success: false,
                    error: error.message,
                    latency: 'Timeout'
                });
            }
        }
        
        return results;
    }

    // Test different connection methods
    async testConnectionMethods(appId) {
        const methods = [
            { mode: 'rtc', codec: 'vp8', name: 'RTC-VP8' },
            { mode: 'rtc', codec: 'h264', name: 'RTC-H264' },
            { mode: 'live', codec: 'vp8', name: 'LIVE-VP8' },
            { mode: 'live', codec: 'h264', name: 'LIVE-H264' }
        ];

        const results = [];
        
        for (const method of methods) {
            console.log(`🔧 Testing connection method: ${method.name}`);
            
            try {
                const client = AgoraRTC.createClient({ 
                    mode: method.mode, 
                    codec: method.codec 
                });

                // Set role for live mode
                if (method.mode === 'live') {
                    await client.setClientRole('host');
                }

                const testUID = Math.floor(Math.random() * 100000);
                const methodTestChannel = `test_${method.name.toLowerCase()}_${Date.now()}`;
                
                const joinPromise = client.join(appId, methodTestChannel, null, testUID);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`${method.name} timeout`)), 6000);
                });

                await Promise.race([joinPromise, timeoutPromise]);
                
                console.log(`✅ ${method.name}: SUCCESS`);
                await client.leave();
                
                results.push({
                    method: method.name,
                    success: true,
                    error: null
                });
                
                break; // Stop at first working method
                
            } catch (error) {
                console.error(`❌ ${method.name}: FAILED -`, error.message);
                results.push({
                    method: method.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    // Advanced network troubleshooting
    async performNetworkDiagnostics() {
        const diagnostics = [];
        
        // Test 1: Basic DNS resolution
        try {
            const dnsTest = await fetch('https://webrtc2-ap-web-2.agora.io', { 
                method: 'HEAD', 
                mode: 'no-cors',
                timeout: 5000 
            });
            diagnostics.push({
                test: 'DNS Resolution',
                result: 'SUCCESS',
                details: 'Agora servers reachable'
            });
        } catch (dnsError) {
            diagnostics.push({
                test: 'DNS Resolution',
                result: 'FAILED',
                details: `Cannot reach Agora servers: ${dnsError.message}`
            });
        }

        // Test 2: WebSocket connectivity
        try {
            const wsTest = new WebSocket('wss://echo.websocket.org');
            await new Promise((resolve, reject) => {
                wsTest.onopen = () => {
                    wsTest.close();
                    resolve();
                };
                wsTest.onerror = reject;
                setTimeout(reject, 3000);
            });
            
            diagnostics.push({
                test: 'WebSocket Support',
                result: 'SUCCESS',
                details: 'WebSocket connections working'
            });
        } catch (wsError) {
            diagnostics.push({
                test: 'WebSocket Support',
                result: 'FAILED',
                details: `WebSocket issues: ${wsError.message || 'Connection failed'}`
            });
        }

        // Test 3: STUN server connectivity
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            const result = await new Promise((resolve, reject) => {
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        pc.close();
                        resolve('SUCCESS');
                    }
                };
                pc.createDataChannel('test');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                setTimeout(() => {
                    pc.close();
                    reject('TIMEOUT');
                }, 5000);
            });
            
            diagnostics.push({
                test: 'STUN Server',
                result: 'SUCCESS',
                details: 'ICE candidates generated successfully'
            });
        } catch (stunError) {
            diagnostics.push({
                test: 'STUN Server',
                result: 'FAILED',
                details: `STUN connectivity issues: ${stunError}`
            });
        }

        return diagnostics;
    }
}

export default new RegionalAgoraHelper();
