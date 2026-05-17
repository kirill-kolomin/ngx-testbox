import { HttpTestingController, TestRequest } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

/**
 * Retrieves all pending HTTP requests from the testing controller queue.
 *
 * @param httpTestingController - The HTTP testing controller instance (defaults to the one from TestBed)
 * @returns An array of TestRequest objects representing pending HTTP requests
 */
export const getRequestsFromQueue = (httpTestingController = TestBed.inject(HttpTestingController)): TestRequest[] => {
  return httpTestingController.match(() => true);
}