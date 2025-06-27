// 카카오맵 경로 계획기
class RoutePlanner {
    constructor() {
        this.map = null;
        this.markers = [];
        this.polylines = [];
        this.locations = [];
        this.currentRoute = null;
        this.routeOptions = [];
        this.markerNumbers = [];
        
        this.init();
    }

    init() {
        this.initMap();
        this.bindEvents();
        this.loadSampleLocations();
        this.showWelcomeMessage();
    }

    initMap() {
        const container = document.getElementById('map');
        const options = {
            center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
            level: 8
        };
        
        this.map = new kakao.maps.Map(container, options);
    }

    bindEvents() {
        // 지점 추가
        document.getElementById('addLocationBtn').addEventListener('click', () => {
            this.addLocation();
        });

        // 엔터키로 지점 추가
        document.getElementById('locationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addLocation();
            }
        });

        // 경로 찾기 버튼들
        document.getElementById('findRouteBtn').addEventListener('click', () => {
            this.findOptimalRoute();
        });

        document.getElementById('findAlternativeBtn').addEventListener('click', () => {
            this.findAlternativeRoutes();
        });

        // 모두 지우기
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAll();
        });

        // 현재 위치
        document.getElementById('currentLocationBtn').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // 지도 초기화
        document.getElementById('resetMapBtn').addEventListener('click', () => {
            this.resetMap();
        });

        // 전체 보기
        document.getElementById('fitBoundsBtn').addEventListener('click', () => {
            this.fitMapToMarkers();
        });

        // 경로 옵션 버튼들
        document.getElementById('optimalRouteBtn').addEventListener('click', () => {
            this.selectRoute(0);
        });

        document.getElementById('altRoute1Btn').addEventListener('click', () => {
            this.selectRoute(1);
        });

        document.getElementById('altRoute2Btn').addEventListener('click', () => {
            this.selectRoute(2);
        });

        document.getElementById('altRoute3Btn').addEventListener('click', () => {
            this.selectRoute(3);
        });

        // 지도 클릭 이벤트
        kakao.maps.event.addListener(this.map, 'click', (mouseEvent) => {
            this.handleMapClick(mouseEvent);
        });
    }

    showWelcomeMessage() {
        const routeInfo = document.getElementById('routeInfo');
        routeInfo.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                <h4 style="margin-bottom: 10px;">🎉 환영합니다!</h4>
                <p style="margin-bottom: 15px;">지점을 추가하고 최적 경로를 찾아보세요.</p>
                <div style="font-size: 14px; opacity: 0.9;">
                    <p>💡 <strong>사용법:</strong></p>
                    <p>1. 장소명이나 주소를 입력하여 지점 추가</p>
                    <p>2. 최소 2개 이상의 지점 추가</p>
                    <p>3. "최적 경로 찾기" 버튼 클릭</p>
                </div>
            </div>
        `;
    }

    async addLocation() {
        const input = document.getElementById('locationInput');
        const locationName = input.value.trim();
        
        if (!locationName) {
            this.showNotification('장소명을 입력해주세요.', 'warning');
            return;
        }

        // 로딩 상태 표시
        const addBtn = document.getElementById('addLocationBtn');
        const originalText = addBtn.textContent;
        addBtn.innerHTML = '<span class="loading"></span> 검색 중...';
        addBtn.disabled = true;

        try {
            const coords = await this.geocode(locationName);
            if (coords) {
                const location = {
                    name: locationName,
                    lat: coords.lat,
                    lng: coords.lng
                };
                
                this.locations.push(location);
                this.addMarker(location, this.locations.length);
                this.updateLocationList();
                input.value = '';
                
                // 지도 범위 조정
                this.fitMapToMarkers();
                
                this.showNotification(`${locationName}이(가) 추가되었습니다!`, 'success');
            }
        } catch (error) {
            this.showNotification('장소를 찾을 수 없습니다. 다른 이름으로 시도해주세요.', 'error');
        } finally {
            addBtn.textContent = originalText;
            addBtn.disabled = false;
        }
    }

    async geocode(address) {
        return new Promise((resolve, reject) => {
            const geocoder = new kakao.maps.services.Geocoder();
            
            geocoder.addressSearch(address, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                    resolve({
                        lat: parseFloat(result[0].y),
                        lng: parseFloat(result[0].x)
                    });
                } else {
                    reject(new Error('Geocoding failed'));
                }
            });
        });
    }

    addMarker(location, orderNumber) {
        // 커스텀 마커 생성 (순서번호 포함)
        const markerContent = `
            <div class="marker-number" style="
                background: #667eea;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
            ">${orderNumber}</div>
        `;

        const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(location.lat, location.lng),
            map: this.map
        });

        // 커스텀 오버레이로 순서번호 표시
        const overlay = new kakao.maps.CustomOverlay({
            content: markerContent,
            position: new kakao.maps.LatLng(location.lat, location.lng),
            map: this.map,
            yAnchor: 1
        });

        const infowindow = new kakao.maps.InfoWindow({
            content: `
                <div style="padding: 10px; min-width: 150px;">
                    <h4 style="margin: 0 0 5px 0; color: #667eea;">${orderNumber}. ${location.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">
                        위도: ${location.lat.toFixed(6)}<br>
                        경도: ${location.lng.toFixed(6)}
                    </p>
                </div>
            `
        });

        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
            infowindow.open(this.map, marker);
        });

        this.markers.push(marker);
        this.markerNumbers.push(overlay);
    }

    updateLocationList() {
        const list = document.getElementById('locationList');
        list.innerHTML = '';
        
        this.locations.forEach((location, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${index + 1}.</strong> ${location.name}</span>
                <button onclick="routePlanner.removeLocation(${index})" title="삭제">🗑️</button>
            `;
            list.appendChild(li);
        });
    }

    removeLocation(index) {
        this.locations.splice(index, 1);
        
        // 마커와 오버레이 제거
        this.markers[index].setMap(null);
        this.markerNumbers[index].setMap(null);
        this.markers.splice(index, 1);
        this.markerNumbers.splice(index, 1);
        
        // 순서번호 재정렬
        this.reorderMarkers();
        
        this.updateLocationList();
        this.fitMapToMarkers();
        
        this.showNotification('지점이 삭제되었습니다.', 'info');
    }

    reorderMarkers() {
        // 기존 마커들 제거
        this.markers.forEach(marker => marker.setMap(null));
        this.markerNumbers.forEach(overlay => overlay.setMap(null));
        
        this.markers = [];
        this.markerNumbers = [];
        
        // 순서번호와 함께 다시 생성
        this.locations.forEach((location, index) => {
            this.addMarker(location, index + 1);
        });
    }

    fitMapToMarkers() {
        if (this.markers.length === 0) return;
        
        const bounds = new kakao.maps.LatLngBounds();
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });
        
        this.map.setBounds(bounds);
    }

    async findOptimalRoute() {
        if (this.locations.length < 2) {
            this.showNotification('경로를 찾으려면 최소 2개의 지점이 필요합니다.', 'warning');
            return;
        }

        const findBtn = document.getElementById('findRouteBtn');
        const originalText = findBtn.textContent;
        findBtn.innerHTML = '<span class="loading"></span> 경로 계산 중...';
        findBtn.disabled = true;

        try {
            const route = await this.calculateRoute(this.locations, 'optimal');
            this.routeOptions = [route];
            this.displayRoute(route, 0);
            this.updateRouteInfo(route);
            this.enableRouteButtons();
            this.showNotification('최적 경로를 찾았습니다!', 'success');
        } catch (error) {
            this.showNotification('경로를 찾을 수 없습니다.', 'error');
        } finally {
            findBtn.textContent = originalText;
            findBtn.disabled = false;
        }
    }

    async findAlternativeRoutes() {
        if (this.locations.length < 2) {
            this.showNotification('경로를 찾으려면 최소 2개의 지점이 필요합니다.', 'warning');
            return;
        }

        const findBtn = document.getElementById('findAlternativeBtn');
        const originalText = findBtn.textContent;
        findBtn.innerHTML = '<span class="loading"></span> 대안 경로 계산 중...';
        findBtn.disabled = true;

        try {
            const routes = await Promise.all([
                this.calculateRoute(this.locations, 'optimal'),
                this.calculateRoute(this.locations, 'alternative1'),
                this.calculateRoute(this.locations, 'alternative2'),
                this.calculateRoute(this.locations, 'alternative3')
            ]);

            this.routeOptions = routes;
            this.displayRoute(routes[0], 0);
            this.updateRouteInfo(routes[0]);
            this.enableRouteButtons();
            this.showNotification('대안 경로들을 찾았습니다!', 'success');
        } catch (error) {
            this.showNotification('대안 경로를 찾을 수 없습니다.', 'error');
        } finally {
            findBtn.textContent = originalText;
            findBtn.disabled = false;
        }
    }

    async calculateRoute(locations, routeType) {
        return new Promise((resolve, reject) => {
            const directions = new kakao.maps.services.Directions();
            
            // 시작점과 도착점 설정
            const origin = new kakao.maps.LatLng(locations[0].lat, locations[0].lng);
            const destination = new kakao.maps.LatLng(locations[locations.length - 1].lat, locations[locations.length - 1].lng);
            
            // 경유지 설정 (중간 지점들)
            const waypoints = locations.slice(1, -1).map(loc => 
                new kakao.maps.LatLng(loc.lat, loc.lng)
            );

            directions.route({
                origin: origin,
                destination: destination,
                waypoints: waypoints,
                priority: routeType === 'optimal' ? kakao.maps.RoutePriority.FASTEST : kakao.maps.RoutePriority.SHORTEST
            }, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    const route = result.routes[0];
                    resolve({
                        type: routeType,
                        distance: route.summary.distance,
                        duration: route.summary.duration,
                        path: route.sections.map(section => section.roads.flatMap(road => road.vertexes))
                    });
                } else {
                    reject(new Error('Route calculation failed'));
                }
            });
        });
    }

    displayRoute(route, routeIndex) {
        // 기존 경로 제거
        this.clearPolylines();
        
        // 새로운 경로 표시
        route.path.forEach((path, index) => {
            const polyline = new kakao.maps.Polyline({
                path: path.map(vertex => new kakao.maps.LatLng(vertex.y, vertex.x)),
                strokeWeight: 5,
                strokeColor: this.getRouteColor(routeIndex),
                strokeOpacity: 0.7,
                strokeStyle: 'solid'
            });
            
            polyline.setMap(this.map);
            this.polylines.push(polyline);
        });

        this.currentRoute = routeIndex;
    }

    getRouteColor(index) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
        return colors[index] || '#FF6B6B';
    }

    clearPolylines() {
        this.polylines.forEach(polyline => {
            polyline.setMap(null);
        });
        this.polylines = [];
    }

    selectRoute(routeIndex) {
        if (this.routeOptions[routeIndex]) {
            this.displayRoute(this.routeOptions[routeIndex], routeIndex);
            this.updateRouteInfo(this.routeOptions[routeIndex]);
            this.showNotification(`경로 ${routeIndex + 1}을(를) 선택했습니다.`, 'info');
        }
    }

    updateRouteInfo(route) {
        const routeInfo = document.getElementById('routeInfo');
        const distance = Math.round(route.distance / 1000 * 10) / 10; // km로 변환
        const duration = Math.round(route.duration / 60); // 분으로 변환
        
        routeInfo.innerHTML = `
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; border-radius: 12px;">
                <h4 style="margin-bottom: 15px; text-align: center;">📊 경로 정보</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 24px; font-weight: bold;">${distance}</div>
                        <div style="font-size: 12px; opacity: 0.9;">총 거리 (km)</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: bold;">${duration}</div>
                        <div style="font-size: 12px; opacity: 0.9;">예상 시간 (분)</div>
                    </div>
                </div>
                <div style="margin-top: 15px; text-align: center; font-size: 14px; opacity: 0.9;">
                    경유지: ${this.locations.length - 2}개
                </div>
            </div>
        `;
    }

    enableRouteButtons() {
        const buttons = ['optimalRouteBtn', 'altRoute1Btn', 'altRoute2Btn', 'altRoute3Btn'];
        buttons.forEach((btnId, index) => {
            const btn = document.getElementById(btnId);
            btn.disabled = !this.routeOptions[index];
        });
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // 현재 위치를 지점으로 추가
                    const location = {
                        name: '현재 위치',
                        lat: lat,
                        lng: lng
                    };
                    
                    this.locations.push(location);
                    this.addMarker(location, this.locations.length);
                    this.updateLocationList();
                    this.fitMapToMarkers();
                    
                    this.showNotification('현재 위치가 추가되었습니다!', 'success');
                },
                (error) => {
                    this.showNotification('현재 위치를 가져올 수 없습니다.', 'error');
                }
            );
        } else {
            this.showNotification('이 브라우저에서는 위치 정보를 지원하지 않습니다.', 'error');
        }
    }

    resetMap() {
        this.clearAll();
        this.map.setCenter(new kakao.maps.LatLng(37.5665, 126.9780));
        this.map.setLevel(8);
        this.showNotification('지도가 초기화되었습니다.', 'info');
    }

    clearAll() {
        this.locations = [];
        
        // 마커와 오버레이 제거
        this.markers.forEach(marker => marker.setMap(null));
        this.markerNumbers.forEach(overlay => overlay.setMap(null));
        this.markers = [];
        this.markerNumbers = [];
        
        this.clearPolylines();
        this.routeOptions = [];
        this.currentRoute = null;
        
        this.updateLocationList();
        this.showWelcomeMessage();
        
        // 버튼 비활성화
        const buttons = ['optimalRouteBtn', 'altRoute1Btn', 'altRoute2Btn', 'altRoute3Btn'];
        buttons.forEach(btnId => {
            document.getElementById(btnId).disabled = true;
        });
    }

    handleMapClick(mouseEvent) {
        const latlng = mouseEvent.latLng;
        
        // 클릭한 위치의 주소 정보 가져오기
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
            if (status === kakao.maps.services.Status.OK) {
                const address = result[0].address.address_name;
                const locationName = prompt(`이 위치를 추가하시겠습니까?\n주소: ${address}\n\n지점명을 입력하세요:`, address);
                
                if (locationName && locationName.trim()) {
                    const location = {
                        name: locationName.trim(),
                        lat: latlng.getLat(),
                        lng: latlng.getLng()
                    };
                    
                    this.locations.push(location);
                    this.addMarker(location, this.locations.length);
                    this.updateLocationList();
                    this.fitMapToMarkers();
                    
                    this.showNotification(`${locationName}이(가) 추가되었습니다!`, 'success');
                }
            }
        });
    }

    showNotification(message, type = 'info') {
        // 간단한 알림 시스템
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // 타입별 색상 설정
        const colors = {
            success: '#48bb78',
            error: '#e53e3e',
            warning: '#ed8936',
            info: '#4299e1'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3초 후 제거
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadSampleLocations() {
        // 샘플 지점들 (사용자가 쉽게 테스트할 수 있도록)
        const samples = [
            '서울역',
            '강남역',
            '홍대입구역',
            '잠실역'
        ];
        
        console.log('샘플 지점들:', samples);
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 페이지 로드 시 초기화
let routePlanner;
document.addEventListener('DOMContentLoaded', () => {
    routePlanner = new RoutePlanner();
});