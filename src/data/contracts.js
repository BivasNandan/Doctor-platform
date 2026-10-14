/** Proposed frontend integration contracts. These describe client expectations, not existing backend routes. */
/** @typedef {{id:string,name:string,slug:string,description:string}} Specialty */
/** @typedef {{id:string,name:string,type:'clinic'|'hospital',address:string,area:string,city:string,distanceKm:number,phone:string,image:string}} Facility */
/** @typedef {{id:string,name:string,specialtyId:string,specialty:string,image?:string,qualifications:string[],experienceYears:number,languages:string[],fee:number,feesByFacility?:Record<string,number>,verificationStatus:'pending'|'verified'|'rejected'|'suspended',publicationStatus:'published'|'unpublished'|'inactive',accountStatus?:'active'|'suspended'|'deactivated'|'deactivation_requested',profileReviewRequired?:boolean,location:string,facilityIds:string[],nextAvailable:string,availability:string[]}} Doctor */
/** @typedef {{id:string,doctorId:string,facilityId:string,date:string,startTime:string,endTime:string,status:'available'|'booked'|'unavailable',simulated?:boolean}} AvailabilitySlot */
/** @typedef {{id:string,doctorId:string,facilityId:string,date:string,time:string,patientName:string,phone:string,email:string,reason:string,status:'pending'|'accepted'|'rejected'|'cancelled'|'completed',simulated?:boolean}} AppointmentRequest */
/** @typedef {{id:string,name:string,phone:string,email:string}} Patient */
/** @typedef {{id:string,participantId:string,participantRole:'patient'|'doctor'|'admin',participantName:string,participantImage?:string,updatedAt:string,unread:number,online?:boolean,canMessage?:boolean}} Conversation */
/** @typedef {{id:string,conversationId:string,sender:'patient'|'doctor'|'admin',body:string,sentAt:string,readAt?:string,isMine?:boolean,attachmentUrl?:string,attachmentName?:string,simulated?:boolean}} Message */
/** @typedef {{id:string,role:'patient'|'doctor'|'admin',doctorId?:string,accountStatus?:string}} AuthenticatedUser */
