'use strict';

function LoadRemainingTime(GloriaAPI, scope) {
	return scope.sequence.execute(function() {
		return GloriaAPI.getRemainingTime(scope.rid, function(data) {
			scope.remaining = Math.max(0, parseInt(data));
		});
	}).then(function() {
	}, function(response) {
		if (response.status == 406) {
			scope.$parent.$parent.reservationEnd = true;
		} else if (response.status == 401) {
			scope.$parent.$parent.notAuthorized = true;
		}
	});
}
function LoadElapsedTime(GloriaAPI, scope) {

	return scope.sequence.execute(function() {
		return GloriaAPI.getElapsedTime(scope.rid, function(data) {
			scope.elapsed = parseInt(data);
			scope.total = scope.remaining + scope.elapsed;
			scope.progressStyle.width = Math.floor(scope.elapsed
					/ (scope.total / 100))
					+ "%";			
			
			if (scope.remaining <= 15) {
				scope.fewSecondsLeft = true;
			}
			
			scope.loaded = true;
			scope.$parent.$parent.elapsedTimeLoaded = true;
		});
	});
}

function SolarElapsedCtrl(GloriaAPI, $sequenceFactory, $scope, $timeout) {

	$scope.sequence = $sequenceFactory.getSequence();
	$scope.remaining = 0;
	$scope.elapsed = 0;
	$scope.total = 900;
	$scope.loaded = false;
	$scope.progressStyle = {};
	$scope.fewSecondsLeft = false;

	$scope.status = {
		time : {}
	};

	$scope.$watch('rid', function() {
		if ($scope.rid > 0) {
			$scope.status.time.timer = $timeout($scope.status.time.onTimeout,
					1000);
		}
	});

	$scope.status.time.onTimeout = function() {

		LoadRemainingTime(GloriaAPI, $scope);
		LoadElapsedTime(GloriaAPI, $scope).then(
				function() {
					$scope.status.time.timer = $timeout(
							$scope.status.time.onTimeout, 5000);
				}, function() {
					$timeout.cancel($scope.status.time.timer);
				});
	};

	$scope.$on('$destroy', function() {
		$timeout.cancel($scope.status.time.timer);
	});
}