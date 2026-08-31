package traq

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

const maxResponseBodySize = 16 << 20

type Source interface {
	FetchUsers(context.Context) ([]User, error)
	FetchGroups(context.Context) ([]Group, error)
}

type Client struct {
	baseURL     *url.URL
	accessToken string
	httpClient  *http.Client
}

func NewClient(rawBaseURL, accessToken string, httpClient *http.Client) (*Client, error) {
	baseURL, err := url.Parse(rawBaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse traQ API base URL: %w", err)
	}
	if baseURL.Scheme != "http" && baseURL.Scheme != "https" {
		return nil, errors.New("traQ API base URL must use http or https")
	}
	if baseURL.Host == "" {
		return nil, errors.New("traQ API base URL must include a host")
	}
	if strings.TrimSpace(accessToken) == "" {
		return nil, errors.New("traQ bot access token is required")
	}
	if httpClient == nil {
		return nil, errors.New("HTTP client is required")
	}

	return &Client{
		baseURL:     baseURL,
		accessToken: accessToken,
		httpClient:  httpClient,
	}, nil
}

func (client *Client) FetchUsers(ctx context.Context) ([]User, error) {
	var users []User
	if err := client.getJSON(ctx, "users", &users); err != nil {
		return nil, fmt.Errorf("fetch traQ users: %w", err)
	}

	return users, nil
}

func (client *Client) FetchGroups(ctx context.Context) ([]Group, error) {
	var groups []Group
	if err := client.getJSON(ctx, "groups", &groups); err != nil {
		return nil, fmt.Errorf("fetch traQ groups: %w", err)
	}

	return groups, nil
}

func (client *Client) getJSON(ctx context.Context, endpoint string, destination any) error {
	requestURL := *client.baseURL
	requestURL.Path = path.Join(requestURL.Path, endpoint)

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL.String(), nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", "Bearer "+client.accessToken)
	request.Header.Set("User-Agent", "1m26_13")

	response, err := client.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 1<<20))
		return fmt.Errorf("unexpected status: %s", response.Status)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBodySize+1))
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	if len(body) > maxResponseBodySize {
		return errors.New("response body is too large")
	}
	if err := json.Unmarshal(body, destination); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	return nil
}
