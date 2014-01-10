'use strict';

function LoadCCDContent(GloriaAPI, scope) {
	return scope.sequence.execute(function() {
		return GloriaAPI.getParameterTreeValue(scope.rid, 'cameras', 'ccd',
				function(data) {
					console.log(data);
					scope.ccds = data.images.slice(0, 2);
				});
	});
}

function LoadFocuserContent(GloriaAPI, scope) {
	return scope.sequence.execute(function() {
		return GloriaAPI.getParameterValue(scope.rid, 'focuser',
				function(data) {
					console.log(data);
					scope.focuser = data;

					if (scope.focuser.last_offset == undefined) {
						scope.focuser.last_offset = 500;
					}

					scope.focuser.offset = scope.focuser.last_offset;

					scope.status.main.focuser.exp_offset = Math
							.floor(scope.focuser.offset
									- scope.focuser.last_offset);
				});
	});
}

function LoadContinuousImage(GloriaAPI, scope, order) {

	scope.sequence.execute(function() {
		return GloriaAPI.setParameterTreeValue(scope.rid, 'cameras',
				'ccd.order', order, function() {
					scope.ccdSelected = order;
				});
	});

	scope.sequence.execute(function() {
		return GloriaAPI.executeOperation(scope.rid, 'stop_continuous_image',
				function() {
					scope.continuousMode = false;
				}, function(error) {
					scope.$parent.ccdProblem = true;
				});
	});

	return scope.sequence.execute(function() {
		return GloriaAPI.executeOperation(scope.rid, 'load_continuous_image',
				function() {
					scope.continuousMode = true;
				}, function(error) {
					scope.$parent.ccdProblem = true;
				});
	});
}

function SetFocuserPosition(GloriaAPI, scope) {

	scope.status.main.focuser.valueSet = false;

	scope.sequence.execute(function() {
		return GloriaAPI.setParameterTreeValue(scope.rid, 'focuser', 'steps',
				scope.focuser.exp_offset, function(data) {
					// PUT SOMETHING HERE!!
				});
	});

	scope.sequence.execute(function() {
		return GloriaAPI.setParameterTreeValue(scope.rid, 'focuser',
				'last_offset', scope.focuser.offset, function(data) {
					scope.focuser.last_offset = scope.focuser.offset;
				});
	});

	return scope.sequence.execute(function() {
		return GloriaAPI.executeOperation(scope.rid, 'move_focus', function(
				data) {
			scope.status.main.focuser.valueSet = true;
		});
	});
}

function SetExposureTime(GloriaAPI, scope) {

	scope.status.main.exposure.valueSet = false;

	if (scope.ccdSelected != 0) {
		scope.sequence.execute(function() {
			return GloriaAPI.setParameterTreeValue(scope.rid, 'cameras',
					'ccd.order', 0, function() {
						scope.ccdSelected = 0;
					});
		});
	}

	scope.sequence.execute(function() {
		return GloriaAPI.setParameterTreeValue(scope.rid, 'cameras',
				'ccd.images.[0].exposure', scope.ccds[0].exposure, function(
						data) {
					// PUT SOMETHING HERE!!
				});
	});

	return scope.sequence.execute(function() {
		return GloriaAPI.executeOperation(scope.rid, 'set_exposure', function(
				data) {
			scope.status.main.exposure.valueSet = true;
		});
	});
}

function LoadCCDAttributes(GloriaAPI, scope, order) {

	scope.sequence.execute(function() {
		return GloriaAPI.setParameterTreeValue(scope.rid, 'cameras',
				'ccd.order', order, function() {
					scope.ccdSelected = order;
				});
	});

	return scope.sequence.execute(function() {
		return GloriaAPI.executeOperation(scope.rid, 'get_ccd_attributes',
				function(data) {

				}, function(error) {
					//scope.$parent.ccdProblem = true;
				});
	});
}

function CheckExposure(GloriaAPI, scope, timeout) {
	scope.status.main.exposure.timer = timeout(
			scope.status.main.exposure.check, 1000);
}

function StartExposure(GloriaAPI, scope, timeout) {

	scope.$parent.imageTaken = false;
	scope.sequence.execute(function() {
		return GloriaAPI.setParameterTreeValue(scope.rid, 'cameras',
				'ccd.order', 0, function() {
					scope.ccdSelected = 0;
				});
	});

	return scope.sequence.execute(function() {
		return GloriaAPI.executeOperation(scope.rid, 'start_exposure',
				function(data) {
					CheckExposure(GloriaAPI, scope, timeout);
				});
	});
}

function SolarCCDCtrl(GloriaAPI, $scope, $timeout, $sequenceFactory) {

	$scope.sequence = $sequenceFactory.getSequence();
	$scope.finderImage = 'templates/experiments/teleoperation/img/wn3.gif';
	$scope.ccds = [ {}, {} ];
	$scope.status = {
		time : {
			count : Math.floor(Math.random() * 100000)
		},
		finder : {
			focused : false
		},
		main : {
			focused : false,
			clock : {
				focused : false
			},
			focus : {
				focused : false
			},
			camera : {
				focused : false
			},
			exposure : {
				begin : null,
				end : null,
				length : 0,
				valueSet : true
			},
			focuser : {
				begin : null,
				end : null,
				length : 0,
				valueSet : true,
				exp_offset : 0
			}
		}
	};

	$scope.exposureStyle = {};
	$scope.focuserStyle = {};
	$scope.exposureBarStyle = {};
	$scope.focuserBarStyle = {};

	$scope.moveFinder = function(direction) {
		$scope.$parent.movementDirection = direction;
		$scope.$parent.movementRequested = true;
	};

	$scope.beginSetExposureTime = function() {
		$scope.status.main.exposure.begin = new Date();
	};

	$scope.endSetExposureTime = function() {
		$scope.status.main.exposure.end = new Date();
		$scope.status.main.exposure.length = ($scope.status.main.exposure.end - $scope.status.main.exposure.begin) / 1000;
		$scope.status.main.exposure.length = Math.min(2.0, Math.max(
				$scope.status.main.exposure.length, 0));
	};

	$scope.beginSetFocuserPosition = function() {
		$scope.status.main.focuser.begin = new Date();
	};

	$scope.endSetFocuserPosition = function() {
		$scope.status.main.focuser.end = new Date();
		$scope.status.main.focuser.length = ($scope.status.main.focuser.end - $scope.status.main.focuser.begin) / 1000;
		$scope.status.main.focuser.length = Math.min(2.0, Math.max(
				$scope.status.main.focuser.length, 0));
	};

	$scope.status.main.exposure.check = function() {
		$scope.sequence.execute(function() {
			return GloriaAPI.getParameterTreeValue($scope.rid, 'cameras',
					'ccd.images.[0].inst', function(data) {
						if (data.id >= 0) {
							if (data.jpg != undefined && data.jpg != null) {
								$scope.$parent.imageTaken = true;
							} else {
								$scope.sequence.execute(function() {
									return GloriaAPI.executeOperation(
											$scope.rid, 'load_image_urls',
											function() {
												CheckExposure(GloriaAPI,
														$scope, $timeout);
											});
								});
							}
						} else {
							alert("exposure failed");
							$scope.$parent.imageTaken = true;
						}
					});
		});
	};

	$scope.setExposureTimeValue = function(sign) {
		$scope.ccds[0].exposure += (0.01 * $scope.status.main.exposure.length)
				* sign;
		console.log($scope.ccds[0].exposure);

		if ($scope.ccds[0].exposure < 0) {
			$scope.ccds[0].exposure = 0;
		} else if ($scope.ccds[0].exposure > 0.05) {
			$scope.ccds[0].exposure = 0.05;
		}

		$scope.exposureStyle.top = ((($scope.ccds[0].exposure * 230 / 0.05) + 83) * -1.0)
				+ "px";
		$scope.exposureBarStyle.top = 230
				- ((($scope.ccds[0].exposure * 230 / 0.05))) + "px";
	};

	$scope.setFocuserPositionValue = function(sign) {
		console.log($scope.status.main.focuser.length);
		$scope.focuser.offset += (150 * $scope.status.main.focuser.length)
				* sign;

		if ($scope.focuser.offset < 0) {
			$scope.focuser.offset = 0;
		} else if ($scope.focuser.offset > 1000) {
			$scope.focuser.offset = 1000;
		}

		$scope.focuser.exp_offset = Math.floor($scope.focuser.offset
				- $scope.focuser.last_offset);
		console.log($scope.focuser.exp_offset);

		var steps = $scope.focuser.offset - 500;
		var height = Math.abs(steps) * 115 / 500;

		$scope.focuserBarStyle.height = height + "px";

		if (steps >= 0) {
			$scope.focuserStyle.top = ((($scope.focuser.offset * 230 / 1000) + 83) * -1.0)
					+ "px";
			$scope.focuserBarStyle.top = (115 - height) + "px";
		} else {
			$scope.focuserStyle.top = (((($scope.focuser.offset * 230 / 1000) + 83) * -1.0) + 25)
					+ "px";
			$scope.focuserBarStyle.top = (115) + "px";
		}

	};

	$scope.setExposureTime = function() {
		SetExposureTime(GloriaAPI, $scope);
	};

	$scope.setFocuserPosition = function() {
		SetFocuserPosition(GloriaAPI, $scope);
	};

	$scope.startExposure = function() {
		StartExposure(GloriaAPI, $scope, $timeout);
	};

	$scope
			.$watch(
					'weatherLoaded',
					function() {
						if ($scope.rid > 0) {

							LoadFocuserContent(GloriaAPI, $scope);
							LoadCCDAttributes(GloriaAPI, $scope, 0);
							LoadCCDContent(GloriaAPI, $scope)
									.then(
											function() {

												var upToDate = true;

												for (var i = 0; i < $scope.ccds.length; i++) {
													if ($scope.ccds[i].cont == undefined
															|| $scope.ccds[i].cont == null) {
														LoadContinuousImage(
																GloriaAPI,
																$scope, i);
														upToDate = false;
													}
												}

												if (!upToDate) {
													LoadCCDContent(GloriaAPI,
															$scope)
															.then(
																	function() {
																		console
																				.log('initial context loaded');
																		$scope.$parent.ccdImagesLoaded = true;

																	});
												} else {
													console
															.log('initial context loaded');
													$scope.$parent.ccdImagesLoaded = true;
												}

												$scope.exposureStyle.top = ((($scope.ccds[0].exposure * 230 / 0.05) + 83) * -1.0)
														+ "px";
												$scope.exposureBarStyle.top = 230
														- ((($scope.ccds[0].exposure * 230 / 0.05)))
														+ "px";

												$scope
														.setFocuserPositionValue(1.0);

												$scope.status.time.timer = $timeout(
														$scope.status.time.onTimeout,
														1000, 1000);

											});
						}
					});

	$scope.status.time.onTimeout = function() {
		$scope.status.time.count += 1;
		var i = 0;
		$scope.ccds
				.forEach(function(index) {
					// $scope.ccds[i].pcont = null; // DELETE THIS!
					if ($scope.ccds[i].cont != null
							&& $scope.ccds[i].cont != undefined) {
						$scope.ccds[i].pcont = $scope.ccds[i].cont + '?d='
								+ $scope.status.time.count;
					}

					i++;
				});
		$scope.status.time.timer = $timeout($scope.status.time.onTimeout, 1000,
				1000);
	};

	$scope.$on('$destroy', function() {
		$timeout.cancel($scope.status.time.timer);
		$timeout.cancel($scope.status.main.exposure.timer);
	});
}
